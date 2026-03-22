package ru.vsz.crm.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Allows EventSource (SSE) clients to pass Basic auth credentials via the
 * {@code ?auth=Basic+<base64>} query parameter, since the browser EventSource
 * API does not support custom request headers.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SseAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if ("/api/vk/events".equals(request.getRequestURI())
                && request.getHeader("Authorization") == null) {
            String authParam = request.getParameter("auth");
            if (authParam != null && !authParam.isBlank()) {
                chain.doFilter(new HttpServletRequestWrapper(request) {
                    @Override
                    public String getHeader(String name) {
                        if ("Authorization".equalsIgnoreCase(name)) return authParam;
                        return super.getHeader(name);
                    }

                    @Override
                    public Enumeration<String> getHeaders(String name) {
                        if ("Authorization".equalsIgnoreCase(name))
                            return Collections.enumeration(List.of(authParam));
                        return super.getHeaders(name);
                    }

                    @Override
                    public Enumeration<String> getHeaderNames() {
                        List<String> names = Collections.list(super.getHeaderNames());
                        if (!names.contains("Authorization")) names.add("Authorization");
                        return Collections.enumeration(names);
                    }
                }, response);
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
