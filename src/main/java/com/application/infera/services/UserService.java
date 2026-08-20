package com.application.infera.services;
import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import org.springframework.stereotype.Service;


@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Long countAllUsers() {
        return userRepository.count();
    }
    public void markWelcomeSeen(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User not found"));
        user.setHasSeenWelcome(true);
        System.out.println("User " + user.getId() + " has seen welcome");
        userRepository.save(user);
    }
}
