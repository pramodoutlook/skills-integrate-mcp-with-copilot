document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const searchInput = document.getElementById("activity-search");
  const categoryFilter = document.getElementById("category-filter");
  const sortSelect = document.getElementById("activity-sort");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let activities = {};

  function populateControls() {
    const selectedCategory = categoryFilter.value;
    const categories = [...new Set(
      Object.values(activities).map((activity) => activity.category)
    )].sort((first, second) => first.localeCompare(second));

    categoryFilter.innerHTML = '<option value="">All categories</option>';
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
    categoryFilter.value = categories.includes(selectedCategory) ? selectedCategory : "";

    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    Object.keys(activities).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
  }

  function renderActivities() {
    const searchTerm = searchInput.value.trim().toLocaleLowerCase();
    const selectedCategory = categoryFilter.value;
    const sortBy = sortSelect.value;
    const filteredActivities = Object.entries(activities).filter(([name, details]) => {
      const matchesCategory = !selectedCategory || details.category === selectedCategory;
      const searchableText = [name, details.category, details.description, details.schedule]
        .join(" ")
        .toLocaleLowerCase();
      return matchesCategory && searchableText.includes(searchTerm);
    });

    filteredActivities.sort(([firstName, firstDetails], [secondName, secondDetails]) => {
      if (sortBy === "time") {
        const timeOrder = firstDetails.start_time.localeCompare(secondDetails.start_time);
        if (timeOrder !== 0) {
          return timeOrder;
        }
      }
      return firstName.localeCompare(secondName);
    });

    activitiesList.innerHTML = "";
    if (filteredActivities.length === 0) {
      activitiesList.innerHTML = "<p>No activities match your filters.</p>";
      return;
    }

    filteredActivities.forEach(([name, details]) => {
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
          : "<p><em>No participants yet</em></p>";

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p><strong>Category:</strong> ${details.category}</p>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }
      activities = await response.json();
      populateControls();
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(button) {
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

  activitiesList.addEventListener("click", (event) => {
    const button = event.target.closest(".delete-btn");
    if (button) {
      handleUnregister(button);
    }
  });

  searchInput.addEventListener("input", renderActivities);
  categoryFilter.addEventListener("change", renderActivities);
  sortSelect.addEventListener("change", renderActivities);

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
