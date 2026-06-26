package com.application.infera.services;

import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import com.application.infera.security.UserSecurityConfig;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final UserSecurityConfig userSecurityConfig;
    public UserService(UserRepository userRepository, UserSecurityConfig userSecurityConfig) {
        this.userRepository = userRepository;
        this.userSecurityConfig = userSecurityConfig;
    }

    public void saveUserToDatabase(@NotNull User user) {
        user.setPassword(userSecurityConfig.passwordEncoder().encode(user.getPassword()));
         userRepository.save(user);
    }
}
