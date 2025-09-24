package com.example.chat.vocab;

import com.example.chat.user.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VocabRepository extends JpaRepository<VocabWord, Long> {
    List<VocabWord> findByUserOrderByCreatedAtDesc(AppUser user);
    boolean existsByUserAndWordIgnoreCase(AppUser user, String word);
}
