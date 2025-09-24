package com.example.chat.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findByUsername(String username);

    // ★ username 유니크 충돌 방지용
    boolean existsByUsername(String username);

    // (선택) 필요하면 사용
    boolean existsByEmail(String email);
}
