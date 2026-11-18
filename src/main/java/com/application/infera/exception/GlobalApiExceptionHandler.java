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

import java.util.Map;

/* JSON/API endpoints: a clean 403 the front-end can react to, never a redirect.
   Higher precedence than the MVC handler, because @RestController counts as a @Controller too. */
@Slf4j
@RestControllerAdvice(annotations = RestController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GlobalApiExceptionHandler {

    @ExceptionHandler({StaleNoteException.class,
            org.springframework.orm.ObjectOptimisticLockingFailureException.class})
    public ResponseEntity<String> handleConflict(Exception ex, HttpServletRequest request) {
        log.info("Edit conflict: {} {}", request.getMethod(), request.getRequestURI());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body("This was changed by someone else. Reload to get the latest version.");
    }

    @ExceptionHandler(WorkspaceNotFoundException.class)
    public ResponseEntity<String> handleWorkspaceNotFound(WorkspaceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(WorkspaceAccessDeniedException.class)
    public ResponseEntity<String> handleAccessDenied(WorkspaceAccessDeniedException ex,
                                                     HttpServletRequest request) {
        log.warn("Access denied: {} {} - {}", request.getMethod(), request.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ex.getMessage());
    }
    @ExceptionHandler(NoteArchiveException.class)
    public ResponseEntity<Map<String, String>> handleArchived(NoteArchiveException e) {
        return ResponseEntity.status(HttpStatus.LOCKED)
                .body(Map.of("message", e.getMessage()));
    }
}