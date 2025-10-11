import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiService, { ScriptStatus, LogEntry, ExecutionHistoryItem, Campaign } from '../../services/api';

const Run: React.FC = () => {
  const [status, setStatus] = useState<ScriptStatus>({
    isRunning: false,
    mode: null,
    startTime: null,
    status: 'idle',
    logCount: 0,
    uptime: 0
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<ExecutionHistoryItem[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testUrl, setTestUrl] = useState('');
  const [recordCount, setRecordCount] = useState(500);
  const [autoScroll, setAutoScroll] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const lastLogTimestamp = useRef<string>('');

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const currentStatus = await apiService.getScriptStatus();
      setStatus(currentStatus);
    } catch (error) {
      // Silently fail - probably server issue
    }
  }, []);

  const loadLogs = useCallback(async () => {
    if (status.isRunning || logs.length === 0) {
      try {
        const response = await apiService.getScriptLogs(lastLogTimestamp.current);
        if (response.logs.length > 0) {
          setLogs(prev => [...prev, ...response.logs]);
          lastLogTimestamp.current = response.logs[response.logs.length - 1].timestamp;
        }
      } catch (error) {
        // Silently fail
      }
    }
  }, [status.isRunning, logs.length]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await apiService.getExecutionHistory();
      setHistory(response.history);
    } catch (error) {
      showMessage('error', 'Failed to load execution history');
    }
  }, [showMessage]);

  const loadCampaigns = useCallback(async () => {
    try {
      const response = await apiService.getCampaigns();
      setCampaigns(response.campaigns || []);
    } catch (error) {
      // Silently fail - campaigns are optional
      console.warn('Could not load campaigns:', error);
    }
  }, []);

  const runScript = async (mode: string) => {
    if (status.isRunning) {
      showMessage('error', 'Script is already running');
      return;
    }

    try {
      setLogs([]); // Clear previous logs
      lastLogTimestamp.current = '';
      
      if (mode === 'campaign') {
        if (!selectedCampaign) {
          showMessage('error', 'Please select a campaign to run');
          return;
        }
        await apiService.runCampaign(selectedCampaign, recordCount);
        showMessage('success', 'Campaign execution started');
      } else {
        await apiService.runScript(mode, mode === 'test' ? testUrl : undefined, recordCount);
        showMessage('success', `Script started in ${mode} mode`);
      }
      
      // Reload status and history
      setTimeout(() => {
        loadStatus();
        loadHistory();
      }, 1000);
      
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to start script');
    }
  };

  const stopScript = async () => {
    if (!status.isRunning) {
      showMessage('error', 'No script is currently running');
      return;
    }

    try {
      await apiService.stopScript();
      showMessage('success', 'Stop signal sent to script');
      
      setTimeout(() => {
        loadStatus();
        loadHistory();
      }, 1000);
      
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to stop script');
    }
  };

  const clearLogs = () => {
    setLogs([]);
    lastLogTimestamp.current = '';
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'running': return '#28a745';
      case 'completed': return '#007bff';
      case 'failed': return '#dc3545';
      case 'stopping': return '#ffc107';
      default: return '#6c757d';
    }
  };

  useEffect(() => {
    // Load initial status and history
    loadStatus();
    loadHistory();
    loadCampaigns();
    
    // Set up polling for status and logs
    const statusInterval = setInterval(loadStatus, 2000); // Every 2 seconds
    const logsInterval = setInterval(loadLogs, 1000); // Every 1 second when running
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(logsInterval);
    };
  }, [loadStatus, loadHistory, loadCampaigns, loadLogs]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  return (
    <div className="component-container">
      <h2>Script Execution & Monitoring</h2>
      <p className="component-description">
        Run and monitor your lead generation script with real-time logging and execution history.
      </p>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Status Dashboard */}
      <div className="status-dashboard">
        <div className="status-card">
          <h3>Current Status</h3>
          <div className="status-indicator">
            <div 
              className="status-dot"
              style={{ backgroundColor: getStatusColor(status.status) }}
            ></div>
            <span className="status-text">
              {status.isRunning ? `Running (${status.mode})` : status.status}
            </span>
          </div>
          {status.isRunning && (
            <div className="status-details">
              <p>Started: {formatTimestamp(status.startTime!)}</p>
              <p>Runtime: {formatDuration(status.uptime)}</p>
              <p>Log entries: {status.logCount}</p>
            </div>
          )}
        </div>
      </div>

      {/* Execution Controls */}
      <div className="execution-controls">
        <h3>Execution Controls</h3>
        
        <div className="control-section">
          <h4>Test Mode</h4>
          <p>Run with a single Apollo search URL for testing</p>
          <input
            type="text"
            placeholder="Apollo search URL (for test mode)"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            disabled={status.isRunning}
            className="url-input"
          />
          <div className="form-row" style={{marginTop: '1rem'}}>
            <div>
              <label htmlFor="record-count">Number of Records</label>
              <input
                type="number"
                id="record-count"
                min="1"
                max="50000"
                value={recordCount}
                onChange={(e) => setRecordCount(parseInt(e.target.value) || 500)}
                disabled={status.isRunning}
                className="form-control"
              />
              <small>Records to process (1-50,000)</small>
            </div>
          </div>
          <button
            onClick={() => runScript('test')}
            disabled={status.isRunning || !testUrl.trim()}
            className="btn btn-secondary"
          >
            Run Test ({recordCount.toLocaleString()} records)
          </button>
        </div>

        <div className="control-section">
          <h4>Production Modes</h4>
          <div className="button-group">
            <button
              onClick={() => runScript('once')}
              disabled={status.isRunning}
              className="btn btn-primary"
            >
              Run Once
            </button>
            <button
              onClick={() => runScript('full')}
              disabled={status.isRunning}
              className="btn btn-primary"
            >
              Full Run
            </button>
            <button
              onClick={stopScript}
              disabled={!status.isRunning}
              className="btn btn-danger"
            >
              Stop Script
            </button>
          </div>
        </div>

        {campaigns.length > 0 && (
          <div className="control-section">
            <h4>Campaign Mode</h4>
            <p>Run all Apollo URLs in a specific campaign</p>
            <div className="form-row">
              <div>
                <label htmlFor="campaign-select">Select Campaign</label>
                <select
                  id="campaign-select"
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  disabled={status.isRunning}
                  className="form-control"
                >
                  <option value="">Choose a campaign...</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.total_urls || 0} URLs, {campaign.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => runScript('campaign')}
              disabled={status.isRunning || !selectedCampaign}
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
            >
              Run Campaign ({recordCount.toLocaleString()} records per URL)
            </button>
          </div>
        )}
      </div>

      {/* Live Logs */}
      <div className="logs-section">
        <div className="logs-header">
          <h3>Live Output</h3>
          <div className="logs-controls">
            <label>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button onClick={clearLogs} className="btn btn-small btn-secondary">
              Clear
            </button>
          </div>
        </div>
        
        <div className="logs-container">
          {logs.length === 0 ? (
            <div className="no-logs">
              No output yet. Start a script to see live logs here.
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`log-entry ${log.type}`}>
                <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Execution History */}
      <div className="history-section">
        <h3>Execution History</h3>
        {history.length === 0 ? (
          <div className="no-history">
            No execution history yet. Run a script to see history here.
          </div>
        ) : (
          <div className="history-table">
            {history.map((item) => (
              <div key={item.id} className={`history-item ${item.success ? 'success' : 'failed'}`}>
                <div className="history-main">
                  <span className="history-mode">{item.mode}</span>
                  <span className="history-duration">{formatDuration(item.duration)}</span>
                  <span className="history-time">{formatTimestamp(item.startTime)}</span>
                </div>
                <div className="history-details">
                  <span>Exit code: {item.exitCode}</span>
                  <span>Logs: {item.logCount}</span>
                  <span>{item.success ? '✅ Success' : '❌ Failed'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Run;