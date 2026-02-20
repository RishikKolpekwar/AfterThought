"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface HederaWalletState {
  connected: boolean;
  accountId: string | null;
  publicKey: string | null;
  connect: () => void;
  disconnect: () => void;
}

const HederaWalletContext = createContext<HederaWalletState>({
  connected: false,
  accountId: null,
  publicKey: null,
  connect: () => {},
  disconnect: () => {},
});

export function useHederaWallet() {
  return useContext(HederaWalletContext);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");

  const connected = !!accountId;
  const publicKey = accountId; // Use account ID as the public identifier

  const connect = useCallback(() => {
    setShowModal(true);
    setInputValue("");
    setInputError("");
  }, []);

  const disconnect = useCallback(() => {
    setAccountId(null);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    // Validate Hedera account ID format: 0.0.XXXXX
    if (!/^0\.0\.\d+$/.test(trimmed)) {
      setInputError("Invalid Hedera account ID. Format: 0.0.XXXXX");
      return;
    }
    setAccountId(trimmed);
    setShowModal(false);
    setInputValue("");
    setInputError("");
  }, [inputValue]);

  return (
    <HederaWalletContext.Provider value={{ connected, accountId, publicKey, connect, disconnect }}>
      {children}

      {/* HashPack / Hedera Wallet Connect Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div
            className="w-full max-w-md mx-4 border border-[#424242] bg-[#0a0a0a] p-8"
            style={{
              clipPath:
                "polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)",
            }}
          >
            {/* Hedera branding header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#8259EF] to-[#5B3BB5] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
                  <path d="M13 11v18M27 11v18M13 17h14M13 23h14" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 className="font-mono text-lg font-bold text-white">Connect Hedera Wallet</h2>
                <p className="font-mono text-xs text-white/40">HashPack / WalletConnect</p>
              </div>
            </div>

            {/* Network badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-block w-2 h-2 rounded-full bg-[#8259EF] animate-pulse" />
              <span className="font-mono text-xs text-[#8259EF] uppercase tracking-wider">
                Hedera {process.env.NEXT_PUBLIC_HEDERA_NETWORK || "testnet"}
              </span>
            </div>

            {inputError && (
              <div className="mb-4 p-3 border border-red-500/30 bg-red-500/10">
                <p className="font-mono text-xs text-red-400">{inputError}</p>
              </div>
            )}

            <div className="mb-6">
              <label className="text-xs font-mono uppercase tracking-wider text-white/40 mb-2 block">
                Hedera Account ID
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setInputError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="0.0.1234567"
                className="w-full bg-black border border-[#424242] text-white font-mono text-lg px-4 py-3 focus:outline-none focus:border-[#8259EF]/50 placeholder:text-white/20"
                autoFocus
              />
              <p className="font-mono text-[10px] text-white/20 mt-2">
                Enter your Hedera account ID from HashPack or another Hedera wallet
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                className="flex-1 font-mono uppercase text-sm tracking-wider px-6 py-3 bg-gradient-to-r from-[#8259EF] to-[#5B3BB5] text-white font-bold hover:opacity-90 transition-all duration-200"
                style={{
                  clipPath:
                    "polygon(8px 0%, calc(100% - 8px) 0%, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0% calc(100% - 8px), 0% 8px)",
                }}
              >
                [Connect]
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="font-mono uppercase text-sm tracking-wider px-6 py-3 border border-[#424242] text-white/60 hover:text-white hover:border-white/30 transition-all duration-200"
              >
                Cancel
              </button>
            </div>

            {/* Footer info */}
            <div className="mt-6 pt-4 border-t border-[#424242]">
              <p className="font-mono text-[10px] text-white/20 text-center">
                Powered by Hedera Hashgraph -- HBAR transfers secured by HCS
              </p>
            </div>
          </div>
        </div>
      )}
    </HederaWalletContext.Provider>
  );
}
