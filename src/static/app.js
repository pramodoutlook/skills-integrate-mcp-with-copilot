document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const categoryFilter = document.getElementById("category-filter");
  const sortFilter = document.getElementById("sort-filter");

  let activities = {};

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      populateFilters(activities);
      renderActivities(activities);
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function populateFilters(activitiesData) {
    const categories = [
      "all",
      ...new Set(
        Object.values(activitiesData).map((activity) => activity.category || "Uncategorized")
      ),
    ];

    categoryFilter.innerHTML = categories
      .map((category) => `<option value="${category}">${category}</option>`)
      .join("");
  }

  function renderActivities(activitiesData) {
    activitiesList.innerHTML = "";
    const filteredActivities = filterActivities(activitiesData);
    const sortedActivities = sortActivities(filteredActivities);

    if (sortedActivities.length === 0) {
      activitiesList.innerHTML = "<p>No activities match the selected filters.</p>";
      return;
    }

    activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

    sortedActivities.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      // Create participants HTML with delete icons instead of bullet points
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
          <p><strong>Category:</strong> ${details.category || "Uncategorized"}</p>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

      activitiesList.appendChild(activityCard);

      // Add option to select dropdown
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

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

  // Handle filter input changes
  categoryFilter.addEventListener("change", () => renderActivities(activities));
  sortFilter.addEventListener("change", () => renderActivities(activities));

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

  function filterActivities(activitiesData) {
    const selectedCategory = categoryFilter.value;
    return Object.entries(activitiesData).filter(([name, details]) => {
      if (selectedCategory === "all") {
        return true;
      }
      return details.category === selectedCategory;
    });
  }

  function sortActivities(activityEntries) {
    const selectedSort = sortFilter.value;
    return activityEntries.sort((a, b) => {
      if (selectedSort === "availability") {
        const aSpots = a[1].max_participants - a[1].participants.length;
        const bSpots = b[1].max_participants - b[1].participants.length;
        return bSpots - aSpots;
      }
      return a[0].localeCompare(b[0]);
    });
  }

  // Initialize app
  fetchActivities();
});
