package com.application.infera.services;

import com.application.infera.models.TodoItem;
import com.application.infera.models.User;
import com.application.infera.repositories.TodoItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Rules for the dashboard's daily to-do list:
 *  - a task belongs to one calendar day; the list starts afresh at 00:00
 *  - at most MAX_PER_DAY tasks per user per day
 *  - unticked tasks from an earlier day are deleted the next time the user loads the list
 *  - ticked tasks stay in the table (just no longer shown) until the user deletes them
 *  - deleting a task removes its row immediately
 *  - no activity logging
 */
@Service
@RequiredArgsConstructor
public class TodoService {

    public static final int MAX_PER_DAY = 4;
    public static final int MAX_LENGTH = 100;

    // Day boundary for "starts afresh at 00:00". Same zone the dashboard controller logs use.
    private static final ZoneId ZONE = ZoneId.of("Africa/Johannesburg");

    private final TodoItemRepository todoRepository;

    private LocalDate today() {
        return LocalDate.now(ZONE);
    }

    /** Epoch millis of the next 00:00, so the page can count down to the same midnight the server uses. */
    public long expiresAtMillis() {
        return today().plusDays(1).atStartOfDay(ZONE).toInstant().toEpochMilli();
    }

    /** Today's list. Also rubs off the user's unticked tasks from earlier days. */
    @Transactional
    public List<TodoItem> getToday(User user) {
        LocalDate today = today();
        todoRepository.deleteOpenBefore(user, today);
        return todoRepository.findByUserAndForDateOrderByCreatedAtAsc(user, today);
    }

    @Transactional
    public TodoItem add(User user, String rawText) {
        String text = rawText == null ? "" : rawText.trim();
        if (text.isEmpty() || text.length() > MAX_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid task text");
        }

        LocalDate today = today();
        if (todoRepository.countByUserAndForDate(user, today) >= MAX_PER_DAY) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Daily task limit reached");
        }

        TodoItem item = new TodoItem();
        item.setUser(user);
        item.setText(text);
        item.setForDate(today);
        return todoRepository.save(item);
    }

    @Transactional
    public TodoItem setDone(User user, Long id, boolean done) {
        TodoItem item = todoRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        // A page left open past midnight may still show yesterday's list: treat those as gone
        if (!item.getForDate().equals(today())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
        }

        item.setDone(done);
        return todoRepository.save(item);
    }

    /** Hard delete, committed when this method returns. Deleting something already gone is not an error. */
    @Transactional
    public void delete(User user, Long id) {
        todoRepository.findByIdAndUser(id, user).ifPresent(todoRepository::delete);
    }
}