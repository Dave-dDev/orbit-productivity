// ===================================
// ORBIT - Interactive JavaScript
// ===================================

// === Smooth Scroll for Navigation Links ===
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      const offsetTop = target.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }
  });
});

// === Scroll Animation Observer ===
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -100px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("animate-in");
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe all elements with data-animate attribute
document.querySelectorAll("[data-animate]").forEach((element) => {
  observer.observe(element);
});

// === Navbar Scroll Effect ===
let lastScroll = 0;
const nav = document.querySelector(".nav");

window.addEventListener("scroll", () => {
  const currentScroll = window.pageYOffset;

  if (currentScroll <= 0) {
    nav.style.boxShadow = "none";
  } else {
    nav.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.3)";
  }

  lastScroll = currentScroll;
});

// === Waitlist Form Handling ===
const waitlistForm = document.getElementById("waitlistForm");
const successMessage = document.getElementById("successMessage");

waitlistForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get form data
  const formData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    role: document.getElementById("role").value,
    platform: document.getElementById("platform").value,
    timestamp: new Date().toISOString(),
  };

  // Simulate form submission (in production, this would send to a backend)
  console.log("Waitlist Submission:", formData);

  // Show success message with animation
  waitlistForm.style.opacity = "0";
  waitlistForm.style.transform = "translateY(-20px)";

  setTimeout(() => {
    waitlistForm.style.display = "none";
    successMessage.style.display = "block";
    successMessage.style.opacity = "0";
    successMessage.style.transform = "translateY(20px)";

    setTimeout(() => {
      successMessage.style.transition = "all 0.5s ease-out";
      successMessage.style.opacity = "1";
      successMessage.style.transform = "translateY(0)";
    }, 50);
  }, 300);

  // Store in localStorage (for demo purposes)
  try {
    let waitlistData = JSON.parse(
      localStorage.getItem("orbitWaitlist") || "[]",
    );
    waitlistData.push(formData);
    localStorage.setItem("orbitWaitlist", JSON.stringify(waitlistData));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }

  // Track conversion (in production, this would be analytics)
  console.log("Conversion tracked:", formData.email);
});

// === Dynamic Stats Counter Animation ===
const animateCounter = (element, target, duration = 2000) => {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = formatNumber(target);
      clearInterval(timer);
    } else {
      element.textContent = formatNumber(Math.floor(current));
    }
  }, 16);
};

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M+";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K+";
  }
  return num.toString();
};

// Animate stats when they come into view
const statsObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const statNumbers = entry.target.querySelectorAll(".stat-number");
        statNumbers.forEach((stat, index) => {
          const text = stat.textContent;
          let target = 0;

          if (text.includes("10K+")) target = 10000;
          else if (text.includes("5K+")) target = 5000;
          else if (text.includes("1M+")) target = 1000000;

          setTimeout(() => {
            animateCounter(stat, target);
          }, index * 200);
        });

        statsObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 },
);

const heroStats = document.querySelector(".hero-stats");
if (heroStats) {
  statsObserver.observe(heroStats);
}

// === Parallax Effect for Hero Background ===
window.addEventListener("scroll", () => {
  const scrolled = window.pageYOffset;
  const heroBackground = document.querySelector(".hero-background");

  if (heroBackground && scrolled < window.innerHeight) {
    heroBackground.style.transform = `translateY(${scrolled * 0.5}px)`;
    heroBackground.style.opacity = 1 - scrolled / window.innerHeight;
  }
});

// === Glass Card Tilt Effect (Mouse Move) ===
const glassCards = document.querySelectorAll(".glass-card, .glass-card-large");

glassCards.forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
  });
});

// === Feature Icons Animation on Hover ===
const featureCards = document.querySelectorAll(".feature-card");

featureCards.forEach((card) => {
  const icon = card.querySelector(".feature-icon");

  card.addEventListener("mouseenter", () => {
    icon.style.transform = "scale(1.2) rotate(5deg)";
    icon.style.transition = "transform 0.3s ease";
  });

  card.addEventListener("mouseleave", () => {
    icon.style.transform = "";
  });
});

// === Form Input Focus Effects ===
const formInputs = document.querySelectorAll(".form-input");

formInputs.forEach((input) => {
  input.addEventListener("focus", () => {
    input.parentElement.style.transform = "translateX(4px)";
    input.parentElement.style.transition = "transform 0.2s ease";
  });

  input.addEventListener("blur", () => {
    input.parentElement.style.transform = "";
  });
});

// === Cursor Trail Effect (Optional Premium Feature) ===
let cursorTrail = [];
const maxTrailLength = 20;

document.addEventListener("mousemove", (e) => {
  cursorTrail.push({ x: e.clientX, y: e.clientY, time: Date.now() });

  if (cursorTrail.length > maxTrailLength) {
    cursorTrail.shift();
  }
});

// === Console Easter Egg ===
console.log(
  "%c🚀 ORBIT",
  "font-size: 40px; font-weight: bold; background: linear-gradient(135deg, #7B2FFF, #CCFF00); -webkit-background-clip: text; color: transparent;",
);
console.log(
  "%cTurning Solo-preneurs into Media Houses",
  "font-size: 16px; color: #CCFF00;",
);
console.log(
  "%cInterested in joining the team? Email us at careers@orbit.com",
  "font-size: 12px; color: #7B2FFF;",
);

// === Performance Optimization: Lazy Load Images ===
if ("IntersectionObserver" in window) {
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.classList.add("loaded");
        imageObserver.unobserve(img);
      }
    });
  });

  document.querySelectorAll(".talent-image").forEach((img) => {
    imageObserver.observe(img);
  });
}

// === Initialize on Page Load ===
window.addEventListener("load", () => {
  // Add loaded class to body for any CSS transitions
  document.body.classList.add("loaded");

  // Log analytics (in production)
  console.log("Page loaded at:", new Date().toISOString());
});
