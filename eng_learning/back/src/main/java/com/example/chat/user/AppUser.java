package com.example.chat.user;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "app_user", uniqueConstraints = {
        @UniqueConstraint(columnNames = "email")
})
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 로그인 기준이 이메일이라면 반드시 unique
    @Column(nullable = false, unique = true, length = 254)
    private String email;

    // 선택(닉네임). 없으면 null 허용. 길이 제한만 둠.
    @Column(unique = true, length = 32)
    private String username;

    @Column(nullable = false)
    private String password;

    // ▼ 아래 4개는 NOT NULL 기본값을 엔티티에서 보장해 500을 방지
    @Column(nullable = false, length = 16)
    private String role = "USER";

    @Column(nullable = false, length = 16)
    private String provider = "LOCAL";

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(nullable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (role == null || role.isBlank()) role = "USER";
        if (provider == null || provider.isBlank()) provider = "LOCAL";
        // enabled는 기본 true
    }

    // --- getters / setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
