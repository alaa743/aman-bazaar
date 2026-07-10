document.addEventListener('DOMContentLoaded', () => {
    
    // 1. The Gate Animation Logic
    const gate = document.getElementById('gate');
    const enterBtn = document.getElementById('enter-btn');
    
    // When the user clicks "Unlock the Gates"
    // enterBtn.addEventListener('click', () => {
        
    // });
    setTimeout(() => {
      // Add the 'open' class to trigger the CSS transition
        gate.classList.add('open');
        
        // Prevent scrolling until the gate is opened
        document.body.style.overflowY = "auto"; 
    }, 1000);

    // Optional: Lock scrolling while gate is closed
    if(!gate.classList.contains('open')){
        document.body.style.overflowY = "hidden";
    }

    // 2. Scroll Reveal Animation Logic
    function reveal() {
        var reveals = document.querySelectorAll(".reveal");
        for (var i = 0; i < reveals.length; i++) {
            var windowHeight = window.innerHeight;
            var elementTop = reveals[i].getBoundingClientRect().top;
            var elementVisible = 100; // how many pixels before element appears

            if (elementTop < windowHeight - elementVisible) {
                reveals[i].classList.add("active");
            }
        }
    }

    // Trigger reveal on scroll
    window.addEventListener("scroll", reveal);
    
    // Trigger once on load to show elements already in view (like the hero text)
    setTimeout(reveal, 1000); 
});