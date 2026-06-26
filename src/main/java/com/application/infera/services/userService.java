package com.application.infera.services;

import com.application.infera.models.User;
import com.application.infera.repositories.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class userService {
    private User user;
    private UserRepository userRepository;

    public void saveUserToDatabase() {}
}
