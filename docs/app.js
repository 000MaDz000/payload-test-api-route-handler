document.addEventListener('DOMContentLoaded', () => {
  // Tab switcher for installation command
  const tabBtns = document.querySelectorAll('.tab-btn');
  const installCmdEl = document.getElementById('install-cmd');

  const installCommands = {
    pnpm: 'pnpm add -D payload-test-api-route-handler',
    npm: 'npm install --save-dev payload-test-api-route-handler',
    yarn: 'yarn add -D payload-test-api-route-handler'
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all
      tabBtns.forEach(b => b.classList.remove('active'));
      // Add active to current
      btn.classList.add('active');

      const pm = btn.getAttribute('data-pm');
      if (installCommands[pm]) {
        installCmdEl.textContent = installCommands[pm];
      }
    });
  });

  // Copy to clipboard functionality
  const copyBtn = document.getElementById('copy-install');
  
  copyBtn.addEventListener('click', async () => {
    const textToCopy = installCmdEl.textContent;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      
      // Provide visual feedback
      const originalSVG = copyBtn.innerHTML;
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 1.15rem; height: 1.15rem;">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;
      
      setTimeout(() => {
        copyBtn.innerHTML = originalSVG;
      }, 2000);
      
    } catch (err) {
      console.error('Failed to copy to clipboard: ', err);
    }
  });

  // Subtle navbar background fade on scroll
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.style.background = 'rgba(6, 9, 19, 0.9)';
      navbar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
    } else {
      navbar.style.background = 'rgba(6, 9, 19, 0.7)';
      navbar.style.boxShadow = 'none';
    }
  });
});
