package hacknc2026.backend.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import hacknc2026.backend.dto.CreateProfileRequest;
import hacknc2026.backend.dto.ProfileResponse;
import hacknc2026.backend.service.ProfileService;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

class ProfileControllerTests {
  private final ProfileService service = mock(ProfileService.class);
  private final MockMvc mvc =
      MockMvcBuilders.standaloneSetup(new ProfileController(service)).build();

  @Test
  void createsProfileAndReturnsItsGeneratedId() throws Exception {
    UUID id = UUID.randomUUID();
    when(service.createProfile(new CreateProfileRequest("alex", "Alex")))
        .thenReturn(new ProfileResponse(id, "alex", "Alex", 0L, 1L, LocalDate.now()));

    mvc.perform(post("/api/v1/profiles").contentType(MediaType.APPLICATION_JSON)
            .content("{\"username\":\"alex\",\"displayName\":\"Alex\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(id.toString()))
        .andExpect(jsonPath("$.totalPoints").value(0))
        .andExpect(jsonPath("$.leaderboardOptIn").doesNotExist())
        .andExpect(jsonPath("$.trips").doesNotExist());
  }

  @Test
  void rejectsMissingBlankAndOversizedFields() throws Exception {
    for (String body : new String[] {
        "{}",
        "{\"username\":\"   \",\"displayName\":\"Alex\"}",
        "{\"username\":\"alex\",\"displayName\":\"\"}",
        "{\"username\":\"" + "a".repeat(256) + "\",\"displayName\":\"Alex\"}"}) {
      mvc.perform(post("/api/v1/profiles").contentType(MediaType.APPLICATION_JSON).content(body))
          .andExpect(status().isBadRequest());
    }
    verifyNoInteractions(service);
  }

  @Test
  void returnsConflictForDuplicateUsername() throws Exception {
    when(service.createProfile(any()))
        .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists"));
    mvc.perform(post("/api/v1/profiles").contentType(MediaType.APPLICATION_JSON)
            .content("{\"username\":\"alex\",\"displayName\":\"Alex\"}"))
        .andExpect(status().isConflict());
  }
}
