package ru.vsz.crm.diagram;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class DiagramController {

    private final DiagramRepository repo;

    public DiagramController(DiagramRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/api/diagrams")
    public List<DiagramDto> list() {
        return repo.findAllByOrderByCreatedAtAsc().stream()
                .map(DiagramDto::from)
                .toList();
    }

    @PostMapping("/api/diagrams")
    @ResponseStatus(HttpStatus.CREATED)
    public DiagramDto create(@RequestBody Map<String, String> body) {
        var d = new Diagram();
        d.setName(body.getOrDefault("name", "Новая диаграмма"));
        d.setNodesJson(body.getOrDefault("nodesJson", "[]"));
        d.setEdgesJson(body.getOrDefault("edgesJson", "[]"));
        return DiagramDto.from(repo.save(d));
    }

    @PutMapping("/api/diagrams/{id}")
    public DiagramDto update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        var d = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (body.containsKey("name"))      d.setName(body.get("name"));
        if (body.containsKey("nodesJson")) d.setNodesJson(body.get("nodesJson"));
        if (body.containsKey("edgesJson")) d.setEdgesJson(body.get("edgesJson"));
        return DiagramDto.from(repo.save(d));
    }

    @DeleteMapping("/api/diagrams/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        repo.deleteById(id);
    }

    record DiagramDto(Long id, String name, String nodesJson, String edgesJson, String updatedAt) {
        static DiagramDto from(Diagram d) {
            return new DiagramDto(d.getId(), d.getName(), d.getNodesJson(), d.getEdgesJson(), d.getUpdatedAt().toString());
        }
    }
}
