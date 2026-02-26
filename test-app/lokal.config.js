module.exports = {
  // Supported locales
  locales: ["en", "fr", "es"],
  
  // Default locale
  defaultLocale: 'en',
  
  // Function name for translations (t("key"))
  functionName: 't',
  
  // Component name for translations (<T>key</T>)
  componentName: 'T',
  
  // Source directory to scan
  sourceDir: './src',
  
  // Output directory for locale files
  outputDir: './locales',
  
  // Use T component instead of t function
  useComponent: true,
  
  // AI Translation settings
  ai: {
    provider: 'gemini',
    apiKey: 'AIzaSyD2VNKwGO_QPsNM8WLE2A2I8nIZ5VUZjec'
  }
};
