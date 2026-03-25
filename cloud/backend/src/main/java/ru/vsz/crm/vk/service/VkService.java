package ru.vsz.crm.vk.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import ru.vsz.crm.client.domain.Client;
import ru.vsz.crm.client.domain.ClientModelInterest;
import ru.vsz.crm.client.domain.ClientSource;
import ru.vsz.crm.client.domain.ClientStatus;
import ru.vsz.crm.client.domain.ClientTemperature;
import ru.vsz.crm.client.repository.ClientRepository;
import ru.vsz.crm.client.service.ClientNotFoundException;
import ru.vsz.crm.order.api.dto.PublicCreateOrderRequest;
import ru.vsz.crm.order.domain.BoatModel;
import ru.vsz.crm.order.service.OrderService;
import ru.vsz.crm.telegram.TelegramService;
import ru.vsz.crm.vk.api.dto.VkCallbackEvent;
import ru.vsz.crm.vk.api.dto.VkDialogSummary;
import ru.vsz.crm.vk.api.dto.VkMessageResponse;
import ru.vsz.crm.vk.api.dto.VkSyncAllResult;
import ru.vsz.crm.vk.domain.VkDialogState;
import ru.vsz.crm.vk.domain.VkMessage;
import ru.vsz.crm.vk.repository.VkDialogStateRepository;
import ru.vsz.crm.vk.repository.VkMessageRepository;

@Service
public class VkService {

    private static final Logger log = LoggerFactory.getLogger(VkService.class);

    private static final String VK_API = "https://api.vk.com/method";
    private static final String VK_VERSION = "5.199";
    private static final int PAGE_SIZE = 200;

    private static final String BOT_STATE_AWAITING_PHONE = "AWAITING_PHONE";

    private static final String KEYBOARD_MAIN = """
            {"one_time":true,"buttons":[[{"action":{"type":"text","payload":"{\\"cmd\\":\\"details\\"}","label":"📋 Узнать подробнее"},"color":"primary"}],[{"action":{"type":"text","payload":"{\\"cmd\\":\\"order\\"}","label":"🚤 Заказать лодку"},"color":"positive"}]]}""";

    private final String communityToken;
    private final long communityId;
    private final VkMessageRepository vkMessageRepository;
    private final VkDialogStateRepository vkDialogStateRepository;
    private final ClientRepository clientRepository;
    private final VkSseService vkSseService;
    private final OrderService orderService;
    private final TelegramService telegramService;
    private final RestClient restClient;

    public VkService(
            @Value("${vk.community-token:}") String communityToken,
            @Value("${vk.community-id:0}") long communityId,
            VkMessageRepository vkMessageRepository,
            VkDialogStateRepository vkDialogStateRepository,
            ClientRepository clientRepository,
            VkSseService vkSseService,
            OrderService orderService,
            TelegramService telegramService) {
        this.communityToken = communityToken;
        this.communityId = communityId;
        this.vkMessageRepository = vkMessageRepository;
        this.vkDialogStateRepository = vkDialogStateRepository;
        this.clientRepository = clientRepository;
        this.vkSseService = vkSseService;
        this.orderService = orderService;
        this.telegramService = telegramService;
        this.restClient = RestClient.create();
    }

    @Transactional(readOnly = true)
    public List<VkDialogSummary> getDialogs() {
        return vkMessageRepository.findAllDistinctClientIds().stream()
                .map(clientId -> {
                    var client = clientRepository.findById(clientId).orElse(null);
                    if (client == null) return null;
                    var lastMsg = vkMessageRepository.findFirstByClientIdOrderBySentAtDesc(clientId);
                    if (lastMsg.isEmpty()) return null;
                    var msg = lastMsg.get();
                    int count = vkMessageRepository.countByClientId(clientId);
                    var state = vkDialogStateRepository.findById(clientId);
                    int unreadCount = state.map(VkDialogState::getUnreadCount).orElse(0);
                    long outReadId = state.map(VkDialogState::getOutReadId).orElse(0L);
                    return new VkDialogSummary(
                            clientId,
                            client.getFullName(),
                            client.getVkProfile(),
                            msg.getText(),
                            msg.getSentAt(),
                            msg.getDirection(),
                            count,
                            unreadCount,
                            outReadId);
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(VkDialogSummary::lastMessageAt,
                        Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<VkMessageResponse> getMessages(Long clientId) {
        clientRepository.findById(clientId).orElseThrow(() -> new ClientNotFoundException(clientId));
        return vkMessageRepository.findAllByClientIdOrderBySentAtAsc(clientId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public VkSyncAllResult syncAllConversations() {
        requireConfigured();

        int totalConversations = 0;
        int newClientsCreated = 0;
        int existingClientsMatched = 0;
        int totalMessagesSynced = 0;

        // 1. Получаем все диалоги сообщества
        List<ConversationData> conversations = fetchAllConversations();
        totalConversations = conversations.size();

        if (conversations.isEmpty()) {
            return new VkSyncAllResult(0, 0, 0, 0);
        }

        // 2. Батчами получаем имена пользователей
        List<Long> peerIds = conversations.stream().map(ConversationData::peerId).toList();
        List<VkUserInfo> userInfos = fetchUserInfos(peerIds);

        // Индекс peerInfo по id для быстрого поиска состояния диалога
        var convByPeerId = conversations.stream()
                .collect(Collectors.toMap(ConversationData::peerId, c -> c));

        // 3. Для каждого — находим или создаём клиента, синхронизируем сообщения
        for (VkUserInfo user : userInfos) {
            String vkIdStr = String.valueOf(user.id());
            var existing = clientRepository.findFirstByVkId(user.id());
            if (existing.isEmpty()) {
                // Обратная совместимость: старые записи могли быть созданы с vk_profile = numeric ID
                existing = clientRepository.findFirstByVkProfile(vkIdStr);
            }

            Long clientId;
            if (existing.isPresent()) {
                // Если vkId ещё не проставлен (старая запись) — проставим
                var existingClient = existing.get();
                if (existingClient.getVkId() == null) {
                    existingClient.setVkId(user.id());
                    clientRepository.save(existingClient);
                }
                clientId = existingClient.getId();
                existingClientsMatched++;
            } else {
                Client client = new Client();
                client.setVkProfile(vkIdStr);
                client.setVkId(user.id());
                client.setFullName(user.firstName() + " " + user.lastName());
                client.setSource(ClientSource.VK);
                client.setStatus(ClientStatus.NEW);
                client.setModelInterest(ClientModelInterest.UNDEFINED);
                client.setTemperature(ClientTemperature.COLD);
                clientId = clientRepository.save(client).getId();
                newClientsCreated++;
            }

            int before = vkMessageRepository.findAllByClientIdOrderBySentAtAsc(clientId).size();
            fetchAndSave(clientId, user.id());
            int after = vkMessageRepository.findAllByClientIdOrderBySentAtAsc(clientId).size();
            totalMessagesSynced += after - before;

            // Сохраняем состояние прочитанности диалога
            var conv = convByPeerId.get(user.id());
            if (conv != null) {
                var state = vkDialogStateRepository.findById(clientId).orElseGet(() -> {
                    var s = new VkDialogState();
                    s.setClientId(clientId);
                    return s;
                });
                state.setUnreadCount(conv.unreadCount());
                state.setInReadId(conv.inRead());
                state.setOutReadId(conv.outRead());
                vkDialogStateRepository.save(state);
            }
        }

        return new VkSyncAllResult(totalConversations, newClientsCreated, existingClientsMatched, totalMessagesSynced);
    }

    @Transactional
    public VkMessageResponse sendMessage(Long clientId, String text) {
        requireConfigured();

        var client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ClientNotFoundException(clientId));

        if (client.getVkProfile() == null || client.getVkProfile().isBlank()) {
            throw new VkNotConfiguredException("У клиента не указан VK профиль");
        }

        long peerId = resolveVkUserId(client.getVkProfile());
        long randomId = System.currentTimeMillis();

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("peer_id", String.valueOf(peerId));
        form.add("message", text);
        form.add("group_id", String.valueOf(communityId));
        form.add("random_id", String.valueOf(randomId));
        form.add("access_token", communityToken);
        form.add("v", VK_VERSION);

        VkSendResponse resp = restClient.post()
                .uri(VK_API + "/messages.send")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(VkSendResponse.class);

        long vkMsgId = (resp != null) ? resp.response() : randomId;

        VkMessage msg = new VkMessage();
        msg.setClientId(clientId);
        msg.setVkMsgId(vkMsgId);
        msg.setText(text);
        msg.setSentAt(OffsetDateTime.now());
        msg.setDirection("OUT");
        vkMessageRepository.save(msg);

        return toResponse(msg);
    }

    @Transactional
    public List<VkMessageResponse> sync(Long clientId) {
        requireConfigured();

        var client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ClientNotFoundException(clientId));

        if (client.getVkProfile() == null || client.getVkProfile().isBlank()) {
            throw new VkNotConfiguredException("У клиента не указан VK профиль");
        }

        long peerId = resolveVkUserId(client.getVkProfile());
        fetchAndSave(clientId, peerId);

        return vkMessageRepository.findAllByClientIdOrderBySentAtAsc(clientId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public void processIncomingMessage(VkCallbackEvent event) {
        var messageNode = event.object() != null ? event.object().get("message") : null;
        log.info("VK callback message_new: object={}", event.object());
        if (messageNode == null) return;

        long fromId = messageNode.has("from_id") ? messageNode.get("from_id").asLong() : 0;
        log.info("VK incoming: fromId={}, text={}, payload={}",
                fromId,
                messageNode.has("text") ? messageNode.get("text").asText() : "",
                messageNode.has("payload") ? messageNode.get("payload").asText() : "");
        if (fromId <= 0) return; // исходящее от сообщества — не сохраняем повторно

        var existing = clientRepository.findFirstByVkId(fromId);
        if (existing.isEmpty()) {
            existing = clientRepository.findFirstByVkProfile(String.valueOf(fromId));
        }
        if (existing.isEmpty()) {
            // Новый пользователь — создаём клиента на лету
            existing = java.util.Optional.of(createClientFromVkId(fromId));
        }

        Long clientId = existing.get().getId();
        long msgId = messageNode.has("id") ? messageNode.get("id").asLong() : 0;
        long date = messageNode.has("date") ? messageNode.get("date").asLong() : 0;
        String text = messageNode.has("text") ? messageNode.get("text").asText("") : "";

        if (vkMessageRepository.findByClientIdAndVkMsgId(clientId, msgId).isPresent()) return;

        VkMessage msg = new VkMessage();
        msg.setClientId(clientId);
        msg.setVkMsgId(msgId);
        msg.setText(text);
        msg.setSentAt(Instant.ofEpochSecond(date).atOffset(ZoneOffset.UTC));
        msg.setDirection("IN");
        vkMessageRepository.save(msg);

        var state = vkDialogStateRepository.findById(clientId).orElseGet(() -> {
            var s = new VkDialogState();
            s.setClientId(clientId);
            return s;
        });
        state.setUnreadCount(state.getUnreadCount() + 1);
        vkDialogStateRepository.save(state);

        vkSseService.broadcast("message_new", Map.of(
                "clientId", clientId,
                "message", toResponse(msg)));

        // Бот-логика — обрабатываем асинхронно после коммита транзакции
        String payload = messageNode.has("payload") ? messageNode.get("payload").asText("") : "";
        handleBot(clientId, fromId, text, payload);
    }

    @Transactional
    public void processMessageRead(VkCallbackEvent event) {
        var obj = event.object();
        if (obj == null) return;

        long fromId = obj.has("from_id") ? obj.get("from_id").asLong() : 0;
        if (fromId <= 0) return; // это мы сами читаем — не нужно обновлять out_read

        long peerId = obj.has("peer_id") ? obj.get("peer_id").asLong() : fromId;
        long localId = obj.has("local_id") ? obj.get("local_id").asLong() : 0;

        var existing = clientRepository.findFirstByVkId(peerId);
        if (existing.isEmpty()) {
            existing = clientRepository.findFirstByVkProfile(String.valueOf(peerId));
        }
        if (existing.isEmpty()) return;

        Long clientId = existing.get().getId();
        var state = vkDialogStateRepository.findById(clientId).orElseGet(() -> {
            var s = new VkDialogState();
            s.setClientId(clientId);
            return s;
        });
        state.setOutReadId(localId);
        vkDialogStateRepository.save(state);

        vkSseService.broadcast("message_read", Map.of(
                "clientId", clientId,
                "outReadId", localId));
    }

    @Transactional
    public void markAsRead(Long clientId) {
        requireConfigured();

        var client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ClientNotFoundException(clientId));

        if (client.getVkProfile() == null || client.getVkProfile().isBlank()) {
            throw new VkNotConfiguredException("У клиента не указан VK профиль");
        }

        long peerId = resolveVkUserId(client.getVkProfile());

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("peer_id", String.valueOf(peerId));
        form.add("group_id", String.valueOf(communityId));
        form.add("access_token", communityToken);
        form.add("v", VK_VERSION);

        restClient.post()
                .uri(VK_API + "/messages.markAsRead")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .toBodilessEntity();

        var state = vkDialogStateRepository.findById(clientId).orElseGet(() -> {
            var s = new VkDialogState();
            s.setClientId(clientId);
            return s;
        });
        state.setUnreadCount(0);
        vkMessageRepository.findFirstByClientIdOrderBySentAtDesc(clientId)
                .ifPresent(msg -> state.setInReadId(msg.getVkMsgId()));
        vkDialogStateRepository.save(state);
    }

    private Client createClientFromVkId(long vkUserId) {
        String name = String.valueOf(vkUserId);
        if (communityToken != null && !communityToken.isBlank()) {
            var infos = fetchUserInfos(List.of(vkUserId));
            if (!infos.isEmpty()) {
                name = infos.get(0).firstName() + " " + infos.get(0).lastName();
            }
        }
        Client client = new Client();
        client.setVkId(vkUserId);
        client.setVkProfile(String.valueOf(vkUserId));
        client.setFullName(name);
        client.setSource(ClientSource.VK);
        client.setStatus(ClientStatus.NEW);
        client.setModelInterest(ClientModelInterest.UNDEFINED);
        client.setTemperature(ClientTemperature.COLD);
        return clientRepository.save(client);
    }

    // ── Bot logic ─────────────────────────────────────────────────────────────

    private void handleBot(Long clientId, long vkUserId, String text, String payload) {
        if (communityToken == null || communityToken.isBlank()) return;

        var state = vkDialogStateRepository.findById(clientId).orElseGet(() -> {
            var s = new VkDialogState();
            s.setClientId(clientId);
            return s;
        });

        // 1. Кнопка «Начать» (ВК приветственное сообщение)
        if (payload.contains("\"command\":\"start\"") || "Начать".equalsIgnoreCase(text.trim())) {
            sendBotMessage(clientId, vkUserId, "Выберите, что вас интересует:", KEYBOARD_MAIN);
            return;
        }

        // 2. Нажата одна из кнопок меню
        if (payload.contains("\"cmd\":\"details\"")) {
            sendBotMessage(clientId, vkUserId,
                    "🚤 Лодки ЛОСЬ 400 — производство ВСЗ:\n\n" +
                    "• ЛОСЬ 400 (базовая) — 140 000 ₽\n" +
                    "• ЛОСЬ 400 Сохатый (с рубкой) — 180 000 ₽\n\n" +
                    "Корпус из ПНД-пластика, не гниёт и не ржавеет.\n" +
                    "Длина 4 м, грузоподъёмность 300 кг.\n" +
                    "Учтём все ваши пожелания при изготовлении.\n" +
                    "Доставка по всей России.",
                    KEYBOARD_MAIN);
            return;
        }

        if (payload.contains("\"cmd\":\"order\"")) {
            state.setBotState(BOT_STATE_AWAITING_PHONE);
            vkDialogStateRepository.save(state);
            sendBotMessage(clientId, vkUserId,
                    "📞 Оставьте ваш номер телефона — менеджер перезвонит в ближайшее время.", null);
            return;
        }

        // 3. Ждём номер телефона
        if (BOT_STATE_AWAITING_PHONE.equals(state.getBotState())) {
            String digits = text.replaceAll("[^0-9]", "");
            if (digits.length() >= 7) {
                var client = clientRepository.findById(clientId).orElse(null);
                String name = client != null ? client.getFullName() : null;
                orderService.createFromPublic(new PublicCreateOrderRequest(
                        name, text.trim(), BoatModel.UNDEFINED, "Заявка из ВК"));
                state.setBotState(null);
                vkDialogStateRepository.save(state);
                sendBotMessage(clientId, vkUserId,
                        "Спасибо! Ваша заявка принята 🙌 Менеджер свяжется с вами в ближайшее время.", null);
            } else {
                sendBotMessage(clientId, vkUserId,
                        "Пожалуйста, укажите номер телефона, например: 89001234567", null);
            }
        }
    }

    private void sendBotMessage(Long clientId, long vkUserId, String text, String keyboard) {
        long randomId = System.currentTimeMillis();

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("peer_id", String.valueOf(vkUserId));
        form.add("message", text);
        form.add("group_id", String.valueOf(communityId));
        form.add("random_id", String.valueOf(randomId));
        form.add("access_token", communityToken);
        form.add("v", VK_VERSION);
        if (keyboard != null) {
            form.add("keyboard", keyboard);
        }

        try {
            VkSendResponse resp = restClient.post()
                    .uri(VK_API + "/messages.send")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(VkSendResponse.class);

            long vkMsgId = (resp != null) ? resp.response() : randomId;

            VkMessage msg = new VkMessage();
            msg.setClientId(clientId);
            msg.setVkMsgId(vkMsgId);
            msg.setText(text);
            msg.setSentAt(OffsetDateTime.now());
            msg.setDirection("OUT");
            vkMessageRepository.save(msg);

            vkSseService.broadcast("message_new", Map.of(
                    "clientId", clientId,
                    "message", toResponse(msg)));
        } catch (Exception e) {
            log.error("Ошибка отправки бот-сообщения клиенту {}: {}", clientId, e.getMessage());
        }
    }

    private long resolveVkUserId(String vkProfile) {
        String s = vkProfile.trim();

        // Убираем протокол
        if (s.startsWith("http://") || s.startsWith("https://")) {
            s = s.replaceFirst("https?://", "");
        }
        // Убираем домен vk.com/
        if (s.startsWith("vk.com/")) {
            s = s.substring("vk.com/".length());
        }
        // Убираем суффикс после ? или #
        s = s.replaceAll("[?#].*", "").replaceAll("/$", "");

        // id123456
        if (s.startsWith("id")) {
            try {
                return Long.parseLong(s.substring(2));
            } catch (NumberFormatException ignored) {
                // не число после id — это screenName вида "ideasmachine" и т.п.
            }
        }

        // Чистое число
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException ignored) {}

        // Resolve screen name через API
        return resolveScreenName(s);
    }

    private long resolveScreenName(String screenName) {
        VkResolveResponse resp = restClient.get()
                .uri(VK_API + "/utils.resolveScreenName?screen_name={name}&access_token={token}&v={v}",
                        screenName, communityToken, VK_VERSION)
                .retrieve()
                .body(VkResolveResponse.class);

        if (resp == null || resp.response() == null || resp.response().objectId() == 0) {
            throw new VkApiException("Не удалось определить VK ID по профилю: " + screenName);
        }
        return resp.response().objectId();
    }

    private void requireConfigured() {
        if (communityToken == null || communityToken.isBlank()) {
            throw new VkNotConfiguredException("VK community token не настроен (VK_COMMUNITY_TOKEN)");
        }
        if (communityId == 0) {
            throw new VkNotConfiguredException("VK community ID не настроен (VK_COMMUNITY_ID)");
        }
    }

    private record ConversationData(long peerId, int unreadCount, long inRead, long outRead) {}

    private List<ConversationData> fetchAllConversations() {
        List<ConversationData> result = new ArrayList<>();
        int offset = 0;
        int total;

        do {
            VkConversationsResponse resp = restClient.get()
                    .uri(VK_API + "/messages.getConversations"
                                    + "?group_id={group}&count={count}&offset={offset}"
                                    + "&access_token={token}&v={v}",
                            communityId, PAGE_SIZE, offset, communityToken, VK_VERSION)
                    .retrieve()
                    .body(VkConversationsResponse.class);

            if (resp == null || resp.response() == null) break;

            total = resp.response().count();
            List<VkConversationItem> items = resp.response().items();
            if (items == null || items.isEmpty()) break;

            for (VkConversationItem item : items) {
                var conv = item.conversation();
                if (conv != null && conv.peer() != null && "user".equals(conv.peer().type())) {
                    result.add(new ConversationData(
                            conv.peer().id(),
                            conv.unreadCount(),
                            conv.inRead(),
                            conv.outRead()));
                }
            }

            offset += items.size();
        } while (offset < total);

        return result;
    }

    private List<VkUserInfo> fetchUserInfos(List<Long> userIds) {
        List<VkUserInfo> result = new ArrayList<>();
        int batchSize = 100;

        for (int i = 0; i < userIds.size(); i += batchSize) {
            List<Long> batch = userIds.subList(i, Math.min(i + batchSize, userIds.size()));
            String ids = batch.stream().map(String::valueOf).collect(Collectors.joining(","));

            VkUsersResponse resp = restClient.get()
                    .uri(VK_API + "/users.get?user_ids={ids}&fields=first_name,last_name&access_token={token}&v={v}",
                            ids, communityToken, VK_VERSION)
                    .retrieve()
                    .body(VkUsersResponse.class);

            if (resp != null && resp.response() != null) {
                result.addAll(resp.response());
            }
        }

        return result;
    }

    private void fetchAndSave(Long clientId, long peerId) {
        int offset = 0;
        int total;

        do {
            VkHistoryResponse resp = restClient.get()
                    .uri(VK_API + "/messages.getHistory"
                                    + "?peer_id={peer}&group_id={group}&count={count}&offset={offset}"
                                    + "&access_token={token}&v={v}",
                            peerId, communityId, PAGE_SIZE, offset, communityToken, VK_VERSION)
                    .retrieve()
                    .body(VkHistoryResponse.class);

            if (resp == null || resp.response() == null) break;

            total = resp.response().count();
            List<VkMessageItem> items = resp.response().items();
            if (items == null || items.isEmpty()) break;

            int savedOnPage = 0;
            for (VkMessageItem item : items) {
                boolean alreadyExists = vkMessageRepository.findByClientIdAndVkMsgId(clientId, item.id()).isPresent();
                if (!alreadyExists) {
                    VkMessage msg = new VkMessage();
                    msg.setClientId(clientId);
                    msg.setVkMsgId(item.id());
                    msg.setText(item.text());
                    msg.setSentAt(Instant.ofEpochSecond(item.date()).atOffset(ZoneOffset.UTC));
                    msg.setDirection(item.out() == 1 ? "OUT" : "IN");
                    vkMessageRepository.save(msg);
                    savedOnPage++;
                }
            }

            // Сообщения идут от новых к старым. Если на этой странице ничего нового — дальше тоже нет.
            if (savedOnPage == 0) break;

            offset += items.size();
        } while (offset < total);
    }

    private VkMessageResponse toResponse(VkMessage msg) {
        return new VkMessageResponse(msg.getId(), msg.getVkMsgId(), msg.getText(), msg.getSentAt(), msg.getDirection());
    }

    // ── VK API response types ────────────────────────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkHistoryResponse(VkHistoryBody response) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkHistoryBody(int count, List<VkMessageItem> items) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkMessageItem(
            long id,
            long date,
            int out,
            String text) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkResolveResponse(VkResolveBody response) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkResolveBody(
            @JsonProperty("object_id") long objectId,
            String type) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkSendResponse(long response) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkConversationsResponse(VkConversationsBody response) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkConversationsBody(int count, List<VkConversationItem> items) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkConversationItem(VkConversation conversation) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkConversation(
            VkPeer peer,
            @JsonProperty("in_read") long inRead,
            @JsonProperty("out_read") long outRead,
            @JsonProperty("unread_count") int unreadCount) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkPeer(long id, String type) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkUsersResponse(List<VkUserInfo> response) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VkUserInfo(
            long id,
            @JsonProperty("first_name") String firstName,
            @JsonProperty("last_name") String lastName) {}
}
