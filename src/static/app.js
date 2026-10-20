document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("activity-search");
  const categoryFilter = document.getElementById("category-filter");
  const sortSelect = document.getElementById("activity-sort");
  let activitiesData = {};

  function getNextSessionTime(details, now) {
    if (!details.schedule_days?.length || !details.schedule_start_time) {
      return Number.MAX_SAFE_INTEGER;
    }

    const [hours, minutes] = details.schedule_start_time.split(":").map(Number);
    const today = (now.getDay() + 6) % 7;

    return Math.min(...details.schedule_days.map((day) => {
      const nextSession = new Date(now);
      const dayOffset = (day - today + 7) % 7;
      nextSession.setDate(nextSession.getDate() + dayOffset);
      nextSession.setHours(hours, minutes, 0, 0);

      if (nextSession <= now) {
        nextSession.setDate(nextSession.getDate() + 7);
      }

      return nextSession.getTime();
    }));
  }

  function renderActivities() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedActivity = activitySelect.value;
    const now = new Date();
    const visibleActivities = Object.entries(activitiesData)
      .filter(([name, details]) => {
        const searchableText = [
          name,
          details.description,
          details.schedule,
          details.category,
        ].join(" ").toLowerCase();

        return (
          (!searchTerm || searchableText.includes(searchTerm)) &&
          (!selectedCategory || details.category === selectedCategory)
        );
      })
      .sort(([nameA, detailsA], [nameB, detailsB]) => {
        if (sortSelect.value === "schedule") {
          const timeDifference =
            getNextSessionTime(detailsA, now) - getNextSessionTime(detailsB, now);
          if (timeDifference !== 0) return timeDifference;
        }
        return nameA.localeCompare(nameB);
      });

    activitiesList.innerHTML = "";
    activitySelect.replaceChildren(new Option("-- Select an activity --", ""));

    visibleActivities.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
          <h4>${name}</h4>
          <p><strong>Category:</strong> ${details.category || "Other"}</p>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

      activitiesList.appendChild(activityCard);

      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });

    if (visibleActivities.some(([name]) => name === selectedActivity)) {
      activitySelect.value = selectedActivity;
    }

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      activitiesData = await response.json();

      const selectedCategory = categoryFilter.value;
      const categories = [...new Set(
        Object.values(activitiesData).map((details) => details.category || "Other")
      )].sort((categoryA, categoryB) => categoryA.localeCompare(categoryB));
      categoryFilter.replaceChildren(new Option("All categories", ""));
      categories.forEach((category) => {
        categoryFilter.appendChild(new Option(category, category));
      });
      if (categories.includes(selectedCategory)) {
        categoryFilter.value = selectedCategory;
      }

      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  searchInput.addEventListener("input", renderActivities);
  categoryFilter.addEventListener("change", renderActivities);
  sortSelect.addEventListener("change", renderActivities);

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
