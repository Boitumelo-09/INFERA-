package com.application.infera.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/* JSON/API endpoints: a clean 403 the front-end can react to, never a redirect.
   Higher precedence than the MVC handler, because @RestController counts as a @Controller too. */
@Slf4j
@RestControllerAdvice(annotations = RestController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalApiExceptionHandler {

    @ExceptionHandler(WorkspaceAccessDeniedException.class)
    public ResponseEntity<String> handleAccessDenied(WorkspaceAccessDeniedException ex,
                                                     HttpServletRequest request) {
        log.warn("Access denied: {} {} - {}", request.getMethod(), request.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ex.getMessage());
    }
}