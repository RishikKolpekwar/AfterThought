import React from 'react';
import ReactDOM from 'react-dom/client';
import SpectatorApp from './SpectatorApp.jsx';

// Parse hash params: #match_id=...&api_token=...&supabase_url=...&anon_key=...
const params = new URLSearchParams(window.location.hash.slice(1));
const matchId = params.get('match_id');
const apiToken = params.get('api_token');
const supabaseUrl = params.get('supabase_url');
const anonKey = params.get('anon_key');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SpectatorApp
      matchId={matchId}
      apiToken={apiToken}
      supabaseUrl={supabaseUrl}
      anonKey={anonKey}
    />
  </React.StrictMode>
);
