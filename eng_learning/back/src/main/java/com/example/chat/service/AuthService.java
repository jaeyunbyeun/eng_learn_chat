package com.example.chat.service;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.example.chat.user.AppUser;
import com.example.chat.user.AppUserRepository;

import java.util.Optional;

@Service
public class AuthService {

    private final AppUserRepository users;
    private final PasswordEncoder encoder;

    public AuthService(AppUserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    public AppUser signup(String email, String username, String rawPassword) {
        AppUser u = new AppUser();
        u.setEmail(email);
        u.setUsername(username);
        u.setPassword(encoder.encode(rawPassword)); // 해시 저장
        return users.save(u);
    }

    public boolean verifyLogin(String email, String rawPassword) {
        return users.findByEmail(email)
                .map(u -> encoder.matches(rawPassword, u.getPassword()))
                .orElse(false);
    }

    public Optional<AppUser> findByEmail(String email) {
        return users.findByEmail(email);
    }
}
