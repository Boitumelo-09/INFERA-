package com.application.infera.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.net.URI;

/* Page/form requests: show the denial as a toast on the page the user came from. */
@Slf4j
@ControllerAdvice
public class GlobalMvcExceptionHandler {

    @ExceptionHandler(WorkspaceAccessDeniedException.class)
    public String handleAccessDenied(WorkspaceAccessDeniedException ex,
                                     HttpServletRequest request,
                                     RedirectAttributes redirectAttributes) {
        log.warn("Access denied: {} {} - {}", request.getMethod(), request.getRequestURI(), ex.getMessage());
        redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        return redirectBack(request);
    }

    // Goes back to where the user came from. Only the PATH of a same-host Referer is trusted,
    // so a forged Referer can never send someone to another site (open-redirect protection).
    private String redirectBack(HttpServletRequest request) {
        String referer = request.getHeader("Referer");
        if (referer != null) {
            try {
                URI uri = URI.create(referer);
                String path = uri.getRawPath();
                if (request.getServerName().equalsIgnoreCase(uri.getHost())
                        && path != null && path.startsWith("/") && !path.startsWith("//")) {
                    return "redirect:" + path + (uri.getRawQuery() != null ? "?" + uri.getRawQuery() : "");
                }
            } catch (IllegalArgumentException ignored) {
                // malformed Referer: fall through to the default
            }
        }
        return "redirect:/dashboard";
    }
}