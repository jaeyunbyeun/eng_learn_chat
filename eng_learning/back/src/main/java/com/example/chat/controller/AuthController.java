package com.example.chat.controller;

import org.springframework.web.bind.annotation.*;
import com.example.chat.service.AuthService;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth = auth; }

    // DTO (로컬 record로 간단히 정의)
    public static record SignupReq(String email, String username, String password) {}
    public static record LoginReq(String email, String password) {}

    @PostMapping("/signup")
    public Object signup(@RequestBody SignupReq req) {
        var user = auth.signup(req.email(), req.username(), req.password());
        return java.util.Map.of("ok", true, "id", user.getId(), "email", user.getEmail());
    }

    @PostMapping("/login")
    public Object login(@RequestBody LoginReq req) {
        boolean ok = auth.verifyLogin(req.email(), req.password());
        return java.util.Map.of("ok", ok);
    }
}
