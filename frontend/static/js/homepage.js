// Initialize EmailJS
(function() {
    emailjs.init("ncww58uXMzbs1Vtj5");
})();

// Mobile menu toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.getElementById('navLinks');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if(targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if(targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Add animation to feature cards on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(card);
});

// Button click handlers (NO UI CHANGES, ONLY CLEAN REDIRECT)
document.querySelectorAll('.btn-primary').forEach(button => {
    if (button.textContent.includes('Nurses')) {
        button.addEventListener('click', () => {
            window.location.href = "nurse_login.html";
        });
    }
});

document.querySelectorAll('.btn-secondary').forEach(button => {
    if (button.textContent.includes('Patients')) {
        button.addEventListener('click', () => {
            window.location.href = "patient_login.html";
        });
    }
});

// EmailJS Contact Form Handling
const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Show loading state
        submitBtn.classList.add('btn-loading');
        submitBtn.disabled = true;
        formStatus.className = 'form-status loading';
        formStatus.textContent = 'Sending your message...';
        
        // Send email using EmailJS (NO BACKEND CHANGE NEEDED)
        emailjs.sendForm('service_izh8w3e', 'template_tstmhc8', this)
            .then(function(response) {
                formStatus.className = 'form-status success';
                formStatus.textContent = 'Thank you! Your message has been sent successfully.';
                contactForm.reset();
            }, function(error) {
                formStatus.className = 'form-status error';
                formStatus.textContent = 'Sorry, there was an error sending your message. Please try again.';
            })
            .finally(function() {
                submitBtn.classList.remove('btn-loading');
                submitBtn.disabled = false;
            });
    });
}
