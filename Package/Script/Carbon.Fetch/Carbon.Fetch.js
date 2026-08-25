/**
 * Helper function to format the output object
 */
function createResponseObject(response, content, method, processId) {
  let sizeInKb = 0;
  if (content) {
    const stringData = typeof content === 'string' ? content : JSON.stringify(content);
    sizeInKb = (new Blob([stringData]).size / 1024).toFixed(2);
  }
  
  return {
    status_code: response ? response.status : 0,
    content: content,
    timestamp: Date.now(),
    content_length: sizeInKb,
    process_id: processId,
    method: method.toUpperCase()
  };
}

/**
 * Helper to parse JSON if possible, otherwise return text
 */
async function parseContent(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

// ==========================================
// 1. OnRead (GET Request)
// ==========================================
class ReaderTask {
  constructor(link) {
    this.link = link;
    this.processId = "req_" + Math.random().toString(36).substr(2, 9);
    this.callbacks = { success: null, pending: null, fail: null };
    
    // Push execution to the next microtask so the user can chain callbacks first
    setTimeout(() => this.execute(), 0);
  }
  
  onSuccess(cb) { this.callbacks.success = cb; return this; }
  onPending(cb) { this.callbacks.pending = cb; return this; }
  onFail(cb) { this.callbacks.fail = cb; return this; }
  
  async execute() {
    const initialData = createResponseObject(null, "Loading...", "GET", this.processId);
    if (this.callbacks.pending) this.callbacks.pending(initialData);
    
    try {
      const response = await fetch(this.link);
      const content = await parseContent(response);
      const finalData = createResponseObject(response, content, "GET", this.processId);
      
      if (response.ok && this.callbacks.success) {
        this.callbacks.success(finalData);
      } else if (!response.ok && this.callbacks.fail) {
        this.callbacks.fail(finalData);
      }
    } catch (error) {
      const errorData = createResponseObject(null, error.message, "GET", this.processId);
      if (this.callbacks.fail) this.callbacks.fail(errorData);
    }
  }
}

// Globally available OnRead function
function OnRead(link) {
  return new ReaderTask(link);
}

// ==========================================
// 2. OnSend (POST Request)
// ==========================================
class SenderTask {
  constructor(link) {
    this.link = link;
    this.processId = "req_" + Math.random().toString(36).substr(2, 9);
    this.callbacks = { success: null, pending: null, fail: null };
    this.payload = null;
  }
  
  onSuccess(cb) { this.callbacks.success = cb; return this; }
  onPending(cb) { this.callbacks.pending = cb; return this; }
  onFail(cb) { this.callbacks.fail = cb; return this; }
  
  onSend(data) {
    this.payload = data;
    setTimeout(() => this.execute(), 0);
    return this;
  }
  
  async execute() {
    const initialData = createResponseObject(null, "Sending...", "POST", this.processId);
    if (this.callbacks.pending) this.callbacks.pending(initialData);
    
    try {
      const response = await fetch(this.link, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.payload)
      });
      
      const content = await parseContent(response);
      const finalData = createResponseObject(response, content, "POST", this.processId);
      
      if (response.ok && this.callbacks.success) {
        this.callbacks.success(finalData);
      } else if (!response.ok && this.callbacks.fail) {
        this.callbacks.fail(finalData);
      }
    } catch (error) {
      const errorData = createResponseObject(null, error.message, "POST", this.processId);
      if (this.callbacks.fail) this.callbacks.fail(errorData);
    }
  }
}

// Globally available OnSend function
function OnSend(link) {
  return new SenderTask(link);
}