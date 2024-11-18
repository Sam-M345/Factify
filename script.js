import config from "./config.js";

// DOM Elements - declare these only once at the top
const factsList = document.querySelector(".facts-list");
const categoryButtons = document.querySelectorAll(".btn-category");
const btnAllCategories = document.querySelector(".btn-all-categories");
const form = document.querySelector(".fact-form");
const textInput = form.querySelector('input[type="text"]');
const sourceInput = form.querySelector('input[type="text"]:nth-child(3)');
const categorySelect = form.querySelector("select");
const btnShare = document.querySelector(".btn-open");
const sortSelect = document.querySelector(".sort-select");

// Update sort select to show placeholder
const currentSort = localStorage.getItem("sortPreference") || "upvoted";

// Add placeholder option if it doesn't exist
if (!sortSelect.querySelector('option[value=""]')) {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.text = "Sort by:";
  placeholder.disabled = true;
  sortSelect.insertBefore(placeholder, sortSelect.firstChild);
}

// Set the current sort value
sortSelect.value = currentSort;

// Categories array
const CATEGORIES = [
  { name: "technology", color: "#3b82f6" },
  { name: "science", color: "#16a34a" },
  { name: "finance", color: "#ef4444" },
  { name: "society", color: "#eab308" },
  { name: "entertainment", color: "#db2777" },
  { name: "health", color: "#14b8a6" },
  { name: "history", color: "#f97316" },
  { name: "news", color: "#8b5cf6" },
];

// Event Listeners
btnAllCategories.addEventListener("click", () => {
  console.log("All categories clicked");
  loadFacts("all");
});

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedCategory = button.textContent.toLowerCase().trim();
    console.log("Category clicked:", selectedCategory);
    loadFacts(selectedCategory);
  });
});

// Event Listeners for voting buttons
const VOTE_TYPES = {
  UPVOTE: "votesUp",
  DOWNVOTE: "votesDown",
};

function createFactsList(dataArray) {
  const htmlArr = dataArray.map(
    (fact) => `<li class="fact">
      <p>${fact.text}</p>
      <div class="fact-bottom-line">
        <div class="source-category-container">
          <a class="source" href="${fact.source}" target="_blank">(Source)</a>
          <span class="tag" style="background-color: ${
            CATEGORIES.find((cat) => cat.name === fact.category)?.color
          }">${fact.category}</span>
        </div>
        <span class="fact-date">Posted on: ${new Date(
          fact.created_at
        ).toLocaleString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
          timeZone: "America/Los_Angeles",
          timeZoneName: "short",
        })}</span>
        <div class="vote-buttons">
          <button class="vote-button" data-vote-type="${
            VOTE_TYPES.UPVOTE
          }" data-fact-id="${fact.id}">
            👍🏻 ${fact.votesUp || 0}
          </button>
          <button class="vote-button" data-vote-type="${
            VOTE_TYPES.DOWNVOTE
          }" data-fact-id="${fact.id}">
            👎🏻 ${fact.votesDown || 0}
          </button>
        </div>
      </div>
      <div class="comments-section hidden" data-fact-id="${fact.id}">
        <h3 class="comments-title">🗣️ User Opinions</h3>
        <div class="comments-list"></div>
      </div>
      <div class="comment-box">
        <textarea class="comment-textarea" placeholder="Share your thoughts about this fact..."></textarea>
        <div class="comment-actions">
          <button class="comment-button cancel-comment">Cancel</button>
          <button class="comment-button submit-comment" data-vote-type="">Submit Vote</button>
        </div>
      </div>
    </li>`
  );

  factsList.innerHTML = htmlArr.join("");

  // Add event listeners for vote buttons and comment box interactions
  document.querySelectorAll(".vote-button").forEach((button) => {
    button.addEventListener("click", handleVote);
  });

  // Load comments for each fact
  loadAllComments(dataArray.map((fact) => fact.id));
}

async function handleVote(e) {
  const button = e.target;
  const factId = button.dataset.factId;
  const voteType = button.dataset.voteType;
  const factElement = button.closest(".fact");
  const commentBox = factElement.querySelector(".comment-box");
  const submitBtn = commentBox.querySelector(".submit-comment");

  // Show comment box for both vote types
  commentBox.classList.add("active");

  // Update submit button text and data attribute based on vote type
  const isUpvote = voteType === VOTE_TYPES.UPVOTE;
  submitBtn.textContent = `Submit ${isUpvote ? "Upvote" : "Downvote"}`;
  submitBtn.dataset.voteType = voteType;

  // Update button color based on vote type
  if (isUpvote) {
    submitBtn.classList.remove("submit-downvote");
    submitBtn.classList.add("submit-upvote");
  } else {
    submitBtn.classList.remove("submit-upvote");
    submitBtn.classList.add("submit-downvote");
  }

  // Handle comment submission
  const cancelBtn = commentBox.querySelector(".cancel-comment");
  const textarea = commentBox.querySelector(".comment-textarea");

  // Remove existing listeners to prevent duplicates
  const newSubmitBtn = submitBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

  // Add new listeners
  newSubmitBtn.addEventListener("click", async () => {
    const comment = textarea.value.trim();
    await submitVoteWithComment(factId, voteType, comment, button);
    commentBox.classList.remove("active");
    textarea.value = "";
  });

  newCancelBtn.addEventListener("click", () => {
    commentBox.classList.remove("active");
    textarea.value = "";
  });
}

// New function to handle vote submission with optional comment
async function submitVoteWithComment(factId, voteType, comment, button) {
  try {
    console.log("Starting vote submission:", { factId, voteType, comment });

    // Get current fact data
    const res = await fetch(`${config.supabaseUrl}?id=eq.${factId}`, {
      headers: {
        apikey: config.supabaseKey,
        authorization: `Bearer ${config.supabaseKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error("Error fetching fact:", await res.text());
      throw new Error("Failed to fetch fact");
    }

    const [fact] = await res.json();
    console.log("Current fact data:", fact);

    // Update vote count
    const updateData = {
      [voteType]: (fact[voteType] || 0) + 1,
    };

    console.log("Updating vote count:", updateData);

    const updateRes = await fetch(`${config.supabaseUrl}?id=eq.${factId}`, {
      method: "PATCH",
      headers: {
        apikey: config.supabaseKey,
        authorization: `Bearer ${config.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(updateData),
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error("Update response error:", errorText);
      throw new Error(`Update failed: ${errorText}`);
    }

    // If there's a comment, insert it
    if (comment) {
      const commentData = {
        fact_id: parseInt(factId),
        comment: comment,
        vote_type: voteType,
        created_at: new Date().toISOString(),
      };

      console.log("Submitting comment:", commentData);

      const baseUrl = config.supabaseUrl.replace("/rest/v1/facts", "");
      const commentsUrl = `${baseUrl}/rest/v1/fact_comments`;

      const commentRes = await fetch(commentsUrl, {
        method: "POST",
        headers: {
          apikey: config.supabaseKey,
          authorization: `Bearer ${config.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(commentData),
      });

      if (!commentRes.ok) {
        const errorText = await commentRes.text();
        console.error("Comment submission failed:", errorText);
        console.error("Response status:", commentRes.status);
        throw new Error(`Failed to submit comment: ${errorText}`);
      }

      console.log("Comment submitted successfully");
      await loadAllComments([factId]);
    }

    // Update button text
    const currentCount = fact[voteType] || 0;
    const newCount = currentCount + 1;
    const emoji = voteType === VOTE_TYPES.UPVOTE ? "👍🏻" : "👎🏻";
    button.textContent = `${emoji} ${newCount}`;

    console.log("Vote submission completed successfully");
  } catch (error) {
    console.error("Error in submitVoteWithComment:", error);
    throw error;
  }
}

// Functions
async function loadFacts(category = "all") {
  try {
    console.log("Loading facts for category:", category);
    const res = await fetch(config.supabaseUrl, {
      headers: {
        apikey: config.supabaseKey,
        authorization: `Bearer ${config.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
    });

    if (!res.ok) throw new Error("Failed to fetch facts");
    const data = await res.json();
    console.log("Fetched data:", data);

    // Filter the facts based on category
    const filteredData =
      category === "all"
        ? data
        : data.filter((fact) => fact.category.toLowerCase() === category);
    console.log("Filtered data:", filteredData);

    // Get sort preference from localStorage or default to "upvoted"
    const sortOption = localStorage.getItem("sortPreference") || "upvoted";

    if (sortOption === "recent") {
      filteredData.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    } else if (sortOption === "upvoted") {
      filteredData.sort((a, b) => {
        const votesA = a.votesUp || 0;
        const votesB = b.votesUp || 0;
        return votesB - votesA;
      });
    }

    // Create new fact elements
    createFactsList(filteredData);
  } catch (error) {
    console.error("Error loading facts:", error);
    factsList.innerHTML =
      "<li>Error loading facts. Please try again later.</li>";
  }
}

// Initial load
loadFacts("all");

// Toggle form visibility
btnShare.addEventListener("click", function () {
  if (form.classList.contains("hidden")) {
    form.classList.remove("hidden");
    btnShare.textContent = "Close";
  } else {
    form.classList.add("hidden");
    btnShare.textContent = "Share a fact";
  }
});

// Handle form submission
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  // Get the input values
  const text = textInput.value;
  const source = sourceInput.value;
  const category = categorySelect.value;

  // Basic validation
  if (text.length > 300) {
    alert("Text must be less than 300 characters");
    return;
  }

  // Basic URL validation - check if it's a valid URL format
  if (!source.includes("http://") && !source.includes("https://")) {
    alert(
      "Please provide a valid source URL starting with http:// or https://"
    );
    return;
  }

  if (!text || !source || !category) {
    alert("Please fill in all fields");
    return;
  }

  // Create the new fact object
  const fact = {
    text,
    source,
    category,
    votesUp: 0,
    votesDown: 0,
  };

  try {
    // Send to Supabase
    const res = await fetch(config.supabaseUrl, {
      method: "POST",
      headers: {
        apikey: config.supabaseKey,
        authorization: `Bearer ${config.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(fact),
    });

    if (!res.ok) throw new Error("Error creating fact");

    // Reset form
    textInput.value = "";
    sourceInput.value = "";
    categorySelect.value = "";
    form.classList.add("hidden");
    btnShare.textContent = "Share a fact";

    // Switch to "most recent" sort
    sortSelect.value = "recent";
    localStorage.setItem("sortPreference", "recent");

    // Reload facts to show the new one at the top
    loadFacts("all");
  } catch (error) {
    console.error("Error creating fact:", error);
    alert("There was an error creating your fact. Please try again.");
  }
});

// Add character counter for text input
textInput.addEventListener("input", function () {
  const remainingChars = 300 - textInput.value.length;
  const counterSpan = form.querySelector("span");
  counterSpan.textContent = remainingChars;
});

// Update the sort event listener to save preference
sortSelect.addEventListener("change", () => {
  localStorage.setItem("sortPreference", sortSelect.value);
  loadFacts(
    btnAllCategories.classList.contains("active") ? "all" : currentCategory
  );
});

// Add a variable to track current category
let currentCategory = "all";

// Update category button click handlers
btnAllCategories.addEventListener("click", () => {
  currentCategory = "all";
  loadFacts("all");
});

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentCategory = button.textContent.toLowerCase().trim();
    loadFacts(currentCategory);
  });
});

// Update the initial state to show "All" as selected when page loads
document.addEventListener("DOMContentLoaded", () => {
  btnAllCategories.classList.add("active");
});

// Update the category button click handlers
btnAllCategories.addEventListener("click", () => {
  currentCategory = "all";
  // Remove active class from all buttons
  categoryButtons.forEach((btn) => btn.classList.remove("active"));
  btnAllCategories.classList.add("active");
  loadFacts("all");
});

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Remove active class from all buttons including "All"
    btnAllCategories.classList.remove("active");
    categoryButtons.forEach((btn) => btn.classList.remove("active"));
    // Add active class to clicked button
    button.classList.add("active");

    currentCategory = button.textContent.toLowerCase().trim();
    loadFacts(currentCategory);
  });
});

// Keep "Sort by:" visible when no option is actively selected
sortSelect.addEventListener("change", (e) => {
  if (!e.target.value) {
    e.target.selectedIndex = 0;
  }
});

// New function to load comments
async function loadAllComments(factIds) {
  try {
    const baseUrl = config.supabaseUrl.replace("/rest/v1/facts", "");
    const commentsUrl = `${baseUrl}/rest/v1/fact_comments`;

    // Use the original query to fetch all comments for all fact IDs
    const queryUrl = `${commentsUrl}?fact_id=in.(${factIds.join(",")})`;
    console.log("Fetching comments with URL:", queryUrl);

    const res = await fetch(queryUrl, {
      headers: {
        apikey: config.supabaseKey,
        authorization: `Bearer ${config.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    });

    console.log("Response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Failed to fetch comments. Status:", res.status);
      console.error("Error text:", errorText);
      throw new Error(`Failed to fetch comments: ${errorText}`);
    }

    const comments = await res.json();
    console.log("Fetched comments:", comments);

    // Process the comments
    factIds.forEach((factId) => {
      const commentsSection = document.querySelector(
        `.comments-section[data-fact-id="${factId}"]`
      );
      if (commentsSection) {
        const commentsList = commentsSection.querySelector(".comments-list");
        commentsList.innerHTML = ""; // Clear existing comments

        // Filter comments for this fact
        const factComments = comments.filter(
          (c) => c.fact_id === parseInt(factId)
        );
        console.log(`Comments for fact ${factId}:`, factComments);

        if (factComments.length > 0) {
          commentsSection.classList.remove("hidden");

          // Sort comments by date (newest first)
          factComments.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );

          // Add comments
          factComments.forEach((comment) => {
            const commentElement = document.createElement("div");
            commentElement.className = "comment";
            const voteEmoji =
              comment.vote_type === VOTE_TYPES.UPVOTE ? "👍🏻" : "👎🏻";
            commentElement.innerHTML = `
              <div class="comment-header">
                <span class="vote-type">${voteEmoji}</span>
                <span class="comment-date">Posted on: ${new Date(
                  comment.created_at
                ).toLocaleString()}</span>
              </div>
              <p class="comment-text">${comment.comment}</p>
            `;
            commentsList.appendChild(commentElement);
          });
        } else {
          commentsSection.classList.add("hidden");
        }
      }
    });
  } catch (error) {
    console.error("Error in loadAllComments:", error);
    console.error("Error stack:", error.stack);
  }
}
