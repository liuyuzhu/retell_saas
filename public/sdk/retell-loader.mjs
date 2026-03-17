// Retell SDK Bundle - Self-contained version
// This file exports RetellWebClient to window

(async function() {
  try {
    // Import livekit-client and eventemitter3 from esm.sh
    const [livekitModule, eventemitterModule, retellModule] = await Promise.all([
      import('https://esm.sh/livekit-client@2.5.2'),
      import('https://esm.sh/eventemitter3@5.0.1'),
      import('https://esm.sh/retell-client-js-sdk@2.0.7')
    ]);
    
    // Export to global scope
    window.livekitClient = livekitModule;
    window.eventemitter3 = eventemitterModule.default || eventemitterModule;
    window.retellClientJsSdk = retellModule;
    
    console.log('SDK loaded successfully');
    console.log('RetellWebClient available:', !!window.retellClientJsSdk?.RetellWebClient);
    
    // Dispatch event to notify page
    window.dispatchEvent(new CustomEvent('retell-sdk-ready'));
  } catch (error) {
    console.error('Failed to load SDK:', error);
    window.dispatchEvent(new CustomEvent('retell-sdk-error', { detail: error }));
  }
})();
