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
  INTERESTING: "votesInteresting",
  MINDBLOWING: "votesMindblowing",
  FALSE: "votesFalse",
};

function createFactsList(dataArray) {
  const htmlArr = dataArray.map(
    (fact) => `<li class="fact">
      <p>
        ${fact.text}
        <a class="source" href="${fact.source}" target="_blank">(Source)</a>
      </p>
      <span class="tag" style="background-color: ${
        CATEGORIES.find((cat) => cat.name === fact.category)?.color
      }">${fact.category}</span>
      <div class="vote-buttons">
        <button class="vote-button" data-vote-type="${
          VOTE_TYPES.INTERESTING
        }" data-fact-id="${fact.id}">
          👍 ${fact.votesInteresting || 0}
        </button>
        <button class="vote-button" data-vote-type="${
          VOTE_TYPES.MINDBLOWING
        }" data-fact-id="${fact.id}">
          🤯 ${fact.votesMindblowing || 0}
        </button>
        <button class="vote-button" data-vote-type="${
          VOTE_TYPES.FALSE
        }" data-fact-id="${fact.id}">
          ⛔️ ${fact.votesFalse || 0}
        </button>
      </div>
    </li>`
  );

  factsList.innerHTML = htmlArr.join("");

  // Add event listeners to all vote buttons
  document.querySelectorAll(".vote-button").forEach((button) => {
    button.addEventListener("click", handleVote);
  });
}

async function handleVote(e) {
  const button = e.target;
  const factId = button.dataset.factId;
  const voteType = button.dataset.voteType;

  try {
    // Get current vote count
    const res = await fetch(`${config.supabaseUrl}?id=eq.${factId}`, {
      headers: {
        apikey: config.supabaseKey,
        authorization: `Bearer ${config.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
    });
    const [fact] = await res.json();

    // Increment the vote
    const updateData = {
      [voteType]: (fact[voteType] || 0) + 1,
    };

    // Update the vote in the database
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

    if (updateRes.ok) {
      // Update the button text immediately
      const currentCount = fact[voteType] || 0;
      const newCount = currentCount + 1;
      const emoji =
        voteType === VOTE_TYPES.INTERESTING
          ? "👍"
          : voteType === VOTE_TYPES.MINDBLOWING
          ? "🤯"
          : "⛔️";
      button.textContent = `${emoji} ${newCount}`;
    }
  } catch (error) {
    console.error("Error updating vote:", error);
    alert("There was an error updating the vote. Please try again.");
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

    // Sort facts by creation date in descending order (newest first)
    filteredData.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

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
  let source = sourceInput.value;
  const category = categorySelect.value;

  // Basic validation
  if (text.length > 200) {
    alert("Text must be less than 200 characters");
    return;
  }

  // Format source URL if needed
  if (!source.startsWith("(Source)")) {
    source = `(Source) ${source}`;
  }

  // Validate URL - check if it contains https://www.
  if (!source.includes("https://www.")) {
    alert("Please provide a valid source URL starting with https://www.");
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
    votesInteresting: 0,
    votesMindblowing: 0,
    votesFalse: 0,
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

    // Reload facts to show the new one
    loadFacts("all");
  } catch (error) {
    console.error("Error creating fact:", error);
    alert("There was an error creating your fact. Please try again.");
  }
});

// Add character counter for text input
textInput.addEventListener("input", function () {
  const remainingChars = 200 - textInput.value.length;
  const counterSpan = form.querySelector("span");
  counterSpan.textContent = remainingChars;
});
