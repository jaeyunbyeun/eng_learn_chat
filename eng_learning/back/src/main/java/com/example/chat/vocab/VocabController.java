package com.example.chat.vocab;

import com.example.chat.user.AppUser;
import com.example.chat.user.AppUserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/vocab")
public class VocabController {

    private static final Logger log = LoggerFactory.getLogger(VocabController.class);

    private static final int USERNAME_MAX = 32;

    private final VocabRepository repo;
    private final AppUserRepository users;
    private final PasswordEncoder encoder;

    public VocabController(VocabRepository repo, AppUserRepository users, PasswordEncoder encoder) {
        this.repo = repo;
        this.users = users;
        this.encoder = encoder;
    }

    // 로컬파트 정제 + 길이 제한
    private String safeBase(String email) {
        String base = email != null && email.contains("@") ? email.substring(0, email.indexOf('@')) : String.valueOf(email);
        base = base == null ? "user" : base.replaceAll("[^A-Za-z0-9_-]", "-");
        if (base.isBlank()) base = "user";
        if (base.length() > USERNAME_MAX) base = base.substring(0, USERNAME_MAX);
        return base;
    }

    // username 유니크 보장: 중복이면 -2, -3 … 붙임
    private String uniqueUsername(String email) {
        String base = safeBase(email);
        String cand = base;
        int n = 2;
        while (users.existsByUsername(cand)) {
            String suf = "-" + n++;
            int cut = Math.max(0, USERNAME_MAX - suf.length());
            cand = base.substring(0, Math.min(base.length(), cut)) + suf;
        }
        return cand;
    }

    // ★ 없으면 자동 생성 (중복은 흡수, 진짜 실패는 500로)
    private AppUser requireUser(String email) {
        return users.findByEmail(email).orElseGet(() -> {
            AppUser u = new AppUser();
            u.setEmail(email);
            u.setUsername(uniqueUsername(email)); // ← 유니크 보장
            u.setPassword(encoder.encode("!tmp-" + UUID.randomUUID()));

            try {
                return users.save(u);
            } catch (DataIntegrityViolationException e) {
                // 1) 경쟁 조건 가능 → 재조회로 흡수
                Optional<AppUser> existing = users.findByEmail(email);
                if (existing.isPresent()) return existing.get();

                // 2) 진짜 제약 위반 등 저장 실패 → 500으로 원인 노출
                String msg = e.getMostSpecificCause() != null
                        ? e.getMostSpecificCause().getMessage()
                        : e.getMessage();
                log.error("Failed to create user for email={}: {}", email, msg, e);
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Failed to create user (check AppUser constraints): " + msg);
            }
        });
    }

    @GetMapping
    public List<VocabWord> list(@RequestHeader("X-Email") String email) {
        return repo.findByUserOrderByCreatedAtDesc(requireUser(email));
    }

    public record AddReq(String word, String meaning, String example) {}

    @PostMapping
    public VocabWord add(@RequestHeader("X-Email") String email, @RequestBody AddReq req) {
        var user = requireUser(email);
        var word = req.word() == null ? "" : req.word().trim();
        if (word.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "word required");
        if (repo.existsByUserAndWordIgnoreCase(user, word)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 저장된 단어예요.");
        }
        var v = new VocabWord();
        v.setUser(user);
        v.setWord(word);
        v.setMeaning(req.meaning());
        v.setExample(req.example());
        v.setKnown(false);
        return repo.save(v);
    }

    public record PatchReq(Boolean known, String meaning, String example) {}

    @PatchMapping("/{id}")
    public VocabWord patch(@RequestHeader("X-Email") String email,
                           @PathVariable Long id,
                           @RequestBody PatchReq req) {
        var user = requireUser(email);
        var v = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (v.getUser()==null || !v.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (req.known()!=null) v.setKnown(req.known());
        if (req.meaning()!=null) v.setMeaning(req.meaning());
        if (req.example()!=null) v.setExample(req.example());
        return repo.save(v);
    }

    @DeleteMapping("/{id}")
    public void delete(@RequestHeader("X-Email") String email, @PathVariable Long id) {
        var user = requireUser(email);
        var v = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (v.getUser()==null || !v.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        repo.delete(v);
    }
}
