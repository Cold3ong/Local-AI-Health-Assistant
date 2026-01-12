// Element SDK - configuration and theming
window.elementSdk = {
  config: {},
  configChangeHandler: null,
  capabilitiesMapper: null,
  editPanelValueMapper: null,

  // Initialize the SDK
  init(options) {
    this.config = options.defaultConfig || {};
    this.configChangeHandler = options.onConfigChange;
    this.capabilitiesMapper = options.mapToCapabilities;
    this.editPanelValueMapper = options.mapToEditPanelValues;
    
    // Load saved config from localStorage if available
    const savedConfig = localStorage.getItem('health_ai_config');
    if (savedConfig) {
      try {
        this.config = JSON.parse(savedConfig);
      } catch (error) {
        console.error('Error loading saved config:', error);
      }
    }
    
    // Apply initial configuration
    if (this.configChangeHandler) {
      this.configChangeHandler(this.config);
    }
    
    return { isOk: true };
  },

  // Update configuration
  setConfig(newConfig) {
    try {
      // Merge with existing config
      this.config = {
        ...this.config,
        ...newConfig
      };
      
      // Save to localStorage
      localStorage.setItem('health_ai_config', JSON.stringify(this.config));
      
      // Notify of change
      if (this.configChangeHandler) {
        this.configChangeHandler(this.config);
      }
      
      return { isOk: true };
    } catch (error) {
      console.error('Error setting config:', error);
      return { isOk: false, error: error.message };
    }
  },

  // Get capabilities
  getCapabilities() {
    if (this.capabilitiesMapper) {
      return this.capabilitiesMapper(this.config);
    }
    return {};
  },

  // Get edit panel values
  getEditPanelValues() {
    if (this.editPanelValueMapper) {
      return this.editPanelValueMapper(this.config);
    }
    return new Map();
  }
};
