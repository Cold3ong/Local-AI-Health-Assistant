// Data SDK - localStorage-based implementation
window.dataSdk = {
  dataHandler: null,
  storageKey: 'health_ai_messages',

  // Initialize the SDK
  async init(handler) {
    this.dataHandler = handler;
    
    // Load existing data and notify handler
    const messages = this.getAllMessages();
    if (handler && handler.onDataChanged) {
      handler.onDataChanged(messages);
    }
    
    return { isOk: true };
  },

  // Create a new message
  async create(message) {
    try {
      const messages = this.getAllMessages();
      
      // Ensure message has required fields
      if (!message.id) {
        message.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      }
      
      if (!message.timestamp) {
        message.timestamp = new Date().toISOString();
      }
      
      messages.push(message);
      this.saveMessages(messages);
      
      // Notify handler of data change
      if (this.dataHandler && this.dataHandler.onDataChanged) {
        this.dataHandler.onDataChanged(messages);
      }
      
      return { isOk: true };
    } catch (error) {
      console.error('Error creating message:', error);
      return { isOk: false, error: error.message };
    }
  },

  // Update a message
  async update(updatedMessage) {
    try {
      const messages = this.getAllMessages();
      const index = messages.findIndex(m => m.id === updatedMessage.id);
      
      if (index !== -1) {
        messages[index] = updatedMessage;
        this.saveMessages(messages);
        
        // Notify handler of data change
        if (this.dataHandler && this.dataHandler.onDataChanged) {
          this.dataHandler.onDataChanged(messages);
        }
        
        return { isOk: true };
      }
      
      return { isOk: false, error: 'Message not found' };
    } catch (error) {
      console.error('Error updating message:', error);
      return { isOk: false, error: error.message };
    }
  },

  // Delete a message
  async delete(message) {
    try {
      let messages = this.getAllMessages();
      const initialLength = messages.length;
      
      messages = messages.filter(m => m.id !== message.id);
      
      if (messages.length < initialLength) {
        this.saveMessages(messages);
        
        // Notify handler of data change
        if (this.dataHandler && this.dataHandler.onDataChanged) {
          this.dataHandler.onDataChanged(messages);
        }
        
        return { isOk: true };
      }
      
      return { isOk: false, error: 'Message not found' };
    } catch (error) {
      console.error('Error deleting message:', error);
      return { isOk: false, error: error.message };
    }
  },

  // Get all messages
  getAllMessages() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading messages:', error);
      return [];
    }
  },

  // Save messages to localStorage
  saveMessages(messages) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }
};
