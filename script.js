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
    (fact) => `<li class="fact" id="fact-${fact.id}">
      <div class="fact-header">
        <p>${fact.text}</p>
        <button class="share-button" data-fact-id="${
          fact.id
        }" title="Share this fact">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12548 15.0077 5.24917 15.0227 5.37061L8.08261 9.19813C7.54305 8.46815 6.6981 8 5.75 8C4.09315 8 2.75 9.34315 2.75 11C2.75 12.6569 4.09315 14 5.75 14C6.6981 14 7.54305 13.5319 8.08261 12.8019L15.0227 16.6294C15.0077 16.7508 15 16.8745 15 17C15 18.6569 16.3431 20 18 20C19.6569 20 21 18.6569 21 17C21 15.3431 19.6569 14 18 14C17.0519 14 16.207 14.4681 15.6674 15.1981L8.72732 11.3706C8.74232 11.2492 8.75 11.1255 8.75 11C8.75 10.8745 8.74232 10.7508 8.72732 10.6294L15.6674 6.80187C16.207 7.53185 17.0519 8 18 8Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
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
      <div class="comment-box">
        <textarea class="comment-textarea" placeholder="Share your thoughts about this fact..."></textarea>
        <div class="comment-actions">
          <button class="comment-button cancel-comment">Cancel</button>
          <button class="comment-button submit-comment" data-vote-type="">Submit Vote</button>
        </div>
      </div>
      <div class="comments-section hidden" data-fact-id="${fact.id}">
        <h3 class="comments-title">🗣️ User Opinions</h3>
        <div class="comments-list"></div>
      </div>
    </li>`
  );

  factsList.innerHTML = htmlArr.join("");

  // Add event listeners for vote buttons and comment box interactions
  document.querySelectorAll(".vote-button").forEach((button) => {
    button.addEventListener("click", handleVote);
  });

  // Add event listeners for share buttons
  document.querySelectorAll(".share-button").forEach((button) => {
    button.addEventListener("click", handleShare);
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
async function loadFacts(category = "all", specificFactId = null) {
  try {
    console.log(
      "Loading facts. Category:",
      category,
      "Specific fact:",
      specificFactId
    );

    // If we have a specific fact ID, modify the fetch URL
    let fetchUrl = config.supabaseUrl;
    if (specificFactId) {
      fetchUrl += `?id=eq.${specificFactId}`;
    }

    const res = await fetch(fetchUrl, {
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

    // If not loading a specific fact, apply category filter
    let filteredData = data;
    if (!specificFactId) {
      filteredData =
        category === "all"
          ? data
          : data.filter((fact) => fact.category.toLowerCase() === category);
    }

    // Get sort preference from localStorage (only if not showing specific fact)
    if (!specificFactId) {
      const sortOption = localStorage.getItem("sortPreference") || "upvoted";
      if (sortOption === "recent") {
        filteredData.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
      } else if (sortOption === "upvoted") {
        filteredData.sort((a, b) => (b.votesUp || 0) - (a.votesUp || 0));
      }
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
  const source = sourceInput.value.trim();
  const category = categorySelect.value;

  // Basic validation
  if (text.length > 300) {
    alert("Text must be less than 300 characters");
    return;
  }

  // Basic URL validation - allow www. format as well
  if (!source.match(/^(https?:\/\/|www\.)/i)) {
    alert(
      "Please provide a valid website URL starting with www. or http:// or https://"
    );
    return;
  }

  // If URL starts with www., add https:// to it
  const formattedSource = source.startsWith("www.")
    ? `https://${source}`
    : source;

  if (!text || !source || !category) {
    alert("Please fill in all fields");
    return;
  }

  // Create the new fact object with formatted source
  const fact = {
    text,
    source: formattedSource,
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
              <p class="comment-text">${linkifyText(comment.comment)}</p>
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

// Add this helper function at the top of your file
function linkifyText(text) {
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(
    urlRegex,
    (url) => `<a href="${url}" target="_blank" class="comment-link">${url}</a>`
  );
}

// Add this new function to handle sharing
async function handleShare(e) {
  const button = e.target.closest(".share-button");
  const factId = button.dataset.factId;
  const shareUrl = `${window.location.origin}${window.location.pathname}#fact-${factId}`;

  try {
    if (navigator.share) {
      // Use native sharing if available (mobile devices)
      await navigator.share({
        title: "Share this fact",
        url: shareUrl,
      });
    } else {
      // Fallback to clipboard copy
      await navigator.clipboard.writeText(shareUrl);

      // Show feedback to user
      const tooltip = document.createElement("div");
      tooltip.className = "share-tooltip";
      tooltip.textContent = "Link copied!";
      button.appendChild(tooltip);

      // Remove tooltip after 2 seconds
      setTimeout(() => {
        tooltip.remove();
      }, 2000);
    }
  } catch (error) {
    console.error("Error sharing:", error);
  }
}

// Add this function to handle direct links
function handleFactLink() {
  const hash = window.location.hash;
  if (hash && hash.startsWith("#fact-")) {
    const factId = hash.replace("#fact-", "");
    loadFacts("all", factId); // Load only the specific fact

    // Hide category buttons when showing a single fact
    const aside = document.querySelector("aside");
    aside.style.display = "none";

    // Make the section take full width when aside is hidden
    const mainSection = document.querySelector(".main");
    mainSection.style.gridTemplateColumns = "1fr";

    // Add a "Back to all facts" button
    const backButton = document.createElement("button");
    backButton.className = "btn btn-large btn-all-categories";
    backButton.textContent = "← Back to all facts";
    backButton.style.marginBottom = "16px";
    backButton.onclick = () => {
      window.location.hash = ""; // Clear the hash
      aside.style.display = "block";
      mainSection.style.gridTemplateColumns = "250px 1fr"; // Restore original layout
      loadFacts("all"); // Load all facts
      backButton.remove(); // Remove the back button
    };

    // Insert the back button before the facts list
    factsList.parentNode.insertBefore(backButton, factsList);
  }
}

// Update event listeners
window.addEventListener("hashchange", handleFactLink);

// Update the DOMContentLoaded listener
document.addEventListener("DOMContentLoaded", () => {
  btnAllCategories.classList.add("active");
  handleFactLink(); // Replace scrollToFact with handleFactLink
});
