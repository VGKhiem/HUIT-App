const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

const newCSS = `

/* --- Custom Radio Buttons --- */
.tt-radio-lbl {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
}
.tt-radio-lbl input[type="radio"] {
  appearance: none;
  background-color: transparent;
  margin: 0;
  margin-right: 6px;
  font: inherit;
  color: currentColor;
  width: 1.15em;
  height: 1.15em;
  border: 2px solid var(--text-secondary);
  border-radius: 50%;
  display: inline-grid;
  place-content: center;
  cursor: pointer;
}
.tt-radio-lbl input[type="radio"]::before {
  content: "";
  width: 0.65em;
  height: 0.65em;
  border-radius: 50%;
  transform: scale(0);
  transition: 120ms transform ease-in-out;
  box-shadow: inset 1em 1em var(--accent-color);
  background-color: var(--accent-color);
}
.tt-radio-lbl input[type="radio"]:checked::before {
  transform: scale(1);
}
.tt-radio-lbl input[type="radio"]:checked {
  border-color: var(--accent-color);
}

/* --- Action Icon Buttons --- */
.tt-action-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  padding: 0;
  margin: 0 4px;
  font-size: 16px;
}
.tt-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
`;

fs.writeFileSync('styles.css', css + newCSS);
console.log('Appended CSS successfully.');
