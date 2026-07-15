package com.application.infera.controllers;

import com.application.infera.dtos.requests.NoteRequest;
import com.application.infera.exception.NoteNotFoundException;
import com.application.infera.exception.WorkspaceNotFoundException;
import com.application.infera.models.Note;
import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import com.application.infera.security.CustomUserDetails;
import com.application.infera.services.NoteService;
import com.application.infera.services.WorkspaceService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
@RequestMapping("/notes")
public class NoteController {

    private final NoteService noteService;
    private final WorkspaceService workspaceService;
    private final UserRepository userRepository;

    public NoteController(NoteService noteService, WorkspaceService workspaceService, UserRepository userRepository) {
        this.noteService = noteService;
        this.workspaceService = workspaceService;
        this.userRepository = userRepository;
    }

    // GET /notes — show all notes across all the user's workspaces
    @GetMapping
    public String listNotes(@AuthenticationPrincipal Object principal, Model model) {
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";

        List<Note> notes = noteService.getNotesForUser(user);

        model.addAttribute("pageTitle", "Notes — INFERA");
        model.addAttribute("user", user);
        model.addAttribute("notes", notes);
        model.addAttribute("noteCount", notes.size());
        model.addAttribute("workspaces", workspaceService.getWorkspacesForUser(user));
        model.addAttribute("workspaceCount", workspaceService.countWorkspacesForUser(user));

        return "notes";
    }

    // POST /notes — create a new note inside a chosen workspace
    @PostMapping
    public String createNote(@AuthenticationPrincipal Object principal,
                             @ModelAttribute NoteRequest noteRequest,
                             RedirectAttributes redirectAttributes) {
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";

        try {
            noteService.createNote(noteRequest, user);
            redirectAttributes.addFlashAttribute("successMessage", "Note \"" + noteRequest.getTitle() + "\" created!");
        } catch (WorkspaceNotFoundException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "That workspace could not be found.");
        }

        return "redirect:/notes";
    }

    // POST /notes/{id}/update
    @PostMapping("/{id}/update")
    public String updateNote(@AuthenticationPrincipal Object principal,
                             @PathVariable Long id,
                             @ModelAttribute NoteRequest noteRequest,
                             RedirectAttributes redirectAttributes) {
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";

        try {
            noteService.updateNote(id, noteRequest, user);
            redirectAttributes.addFlashAttribute("successMessage", "Note updated!");
        } catch (NoteNotFoundException | WorkspaceNotFoundException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }

        return "redirect:/notes";
    }

    // POST /notes/{id}/delete
    @PostMapping("/{id}/delete")
    public String deleteNote(@AuthenticationPrincipal Object principal,
                             @PathVariable Long id,
                             RedirectAttributes redirectAttributes) {
        User user = resolveUser(principal);
        if (user == null) return "redirect:/signin";

        try {
            noteService.deleteNote(id, user);
            redirectAttributes.addFlashAttribute("successMessage", "Note deleted.");
        } catch (NoteNotFoundException e) {
            redirectAttributes.addFlashAttribute("errorMessage", e.getMessage());
        }

        return "redirect:/notes";
    }

    // Resolves the logged-in user regardless of login method
    private User resolveUser(Object principal) {
        if (principal instanceof CustomUserDetails ud) {
            return ud.getUser();
        }
        if (principal instanceof OAuth2User ou) {
            String email = ou.getAttribute("email");
            if (email == null) return null;
            return userRepository.findByEmail(email).orElse(null);
        }
        return null;
    }
}