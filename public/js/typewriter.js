class TypeWriter {
  constructor(txtElement, words, wait = 3000) {
    this.txtElement = txtElement;
    this.words = words;
    this.txt = "";
    this.wordIndex = 0;
    this.wait = parseInt(wait, 10);
    this.isDeleting = false;
    this.type();
  }

  // Type Method
  type() {
    // Get the current string
    const current = this.wordIndex % this.words.length;

    // Get the full text of the current string
    const fullText = this.words[current];

    // Check if deleting
    if (this.isDeleting) {
      // Remove char
      this.txt = fullText.substring(0, this.txt.length - 1);
    } else {
      // Add Char
      this.txt = fullText.substring(0, this.txt.length + 1);
    }

    // Insert txt into element
    this.txtElement.innerHTML = `<span class="txt">${this.txt}</span>`;

    // Initial Type Speed
    let typeSpeed = 100;

    if (this.isDeleting) {
      typeSpeed /= 2;
    }

    // If Word is complete or deleting is complete
    if (this.txt === fullText && !this.isDeleting) {
      typeSpeed = this.wait;
      this.isDeleting = true;
    } else if (this.txt == "" && this.isDeleting) {
      this.isDeleting = false;
      // Move to the next word
      this.wordIndex++;
      // Pause before start typing
      typeSpeed = 500;
    }

    setTimeout(() => {
      this.type();
    }, typeSpeed);
  }
}

// Initialize on DOM Load

document.addEventListener("DOMContentLoaded", () => {
  const txtElement = document.querySelector(".txt-type");
  const words = ["Perplexity 2021, the game begins here!"];
  const wait = txtElement.getAttribute("data-wait");
  const typeWriter = new TypeWriter(txtElement, words, wait);
});
