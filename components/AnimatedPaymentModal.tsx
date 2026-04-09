"use client";

import { useEffect } from "react";

type AnimatedPaymentModalProps = {
  isOpen: boolean;
  amount: number;
  onClose: () => void;
  paymentMethod: "paystack" | "manual";
};

export default function AnimatedPaymentModal({
  isOpen,
  amount,
  onClose,
  paymentMethod,
}: AnimatedPaymentModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes containerPopIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes slide-top {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-70px) rotate(90deg);
          }
          60% {
            transform: translateY(-70px) rotate(90deg);
          }
          100% {
            transform: translateY(-8px) rotate(90deg);
          }
        }

        @keyframes slide-post {
          50% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-70px);
          }
        }

        @keyframes fade-in-fwd {
          0% {
            opacity: 0;
            transform: translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .payment-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
        }

        .payment-modal-content {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 500px;
          width: 90%;
          position: relative;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .payment-close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 4px 8px;
          transition: color 0.2s;
        }

        .payment-close-btn:hover {
          color: #000;
        }

        .payment-card-container {
          background-color: #ffffff;
          display: flex;
          width: 100%;
          max-width: 350px;
          height: 150px;
          position: relative;
          border-radius: 6px;
          transition: 0.3s ease-in-out;
          margin: 0 auto 30px;
          border: 2px solid #f0f0f0;
          animation: containerPopIn 0.5s ease-out forwards;
        }

        .payment-card-container:hover {
          transform: scale(1.03);
        }

        .payment-card-container:hover .payment-left-side {
          width: 100%;
        }

        .payment-left-side {
          background: linear-gradient(135deg, #5de2a3 0%, #2cc980 100%);
          width: 140px;
          height: 150px;
          border-radius: 4px;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: 0.3s;
          flex-shrink: 0;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(93, 226, 163, 0.3);
        }

        .payment-right-side {
          display: flex;
          align-items: center;
          overflow: hidden;
          cursor: pointer;
          justify-content: space-between;
          white-space: nowrap;
          transition: 0.3s;
          flex: 1;
          padding: 0 20px;
        }

        .payment-right-side:hover {
          background-color: #f9f7f9;
        }

        .payment-info {
          flex: 1;
        }

        .payment-label {
          font-size: 12px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }

        .payment-amount {
          font-size: 28px;
          font-weight: 900;
          color: #2cc980;
          font-family: monospace;
        }

        .payment-method-label {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .card {
          width: 70px;
          height: 46px;
          background-color: #c7ffbc;
          border-radius: 6px;
          position: absolute;
          display: flex;
          z-index: 10;
          flex-direction: column;
          align-items: center;
          box-shadow: 9px 9px 9px -2px rgba(77, 200, 143, 0.72);
        }

        .card-line {
          width: 65px;
          height: 13px;
          background-color: #80ea69;
          border-radius: 2px;
          margin-top: 7px;
        }

        .buttons {
          width: 8px;
          height: 8px;
          background-color: #379e1f;
          box-shadow: 0 -10px 0 0 #26850e, 0 10px 0 0 #56be3e;
          border-radius: 50%;
          margin-top: 5px;
          transform: rotate(90deg);
          margin: 10px 0 0 -30px;
        }

        .payment-card-container:hover .card {
          animation: slide-top 1.2s cubic-bezier(0.645, 0.045, 0.355, 1) both;
        }

        .payment-card-container:hover .post {
          animation: slide-post 1s cubic-bezier(0.165, 0.84, 0.44, 1) both;
        }

        .post {
          width: 63px;
          height: 75px;
          background-color: #dddde0;
          position: absolute;
          z-index: 11;
          bottom: 10px;
          top: 150px;
          border-radius: 6px;
          overflow: hidden;
        }

        .post-line {
          width: 47px;
          height: 9px;
          background-color: #545354;
          position: absolute;
          border-radius: 0 0 3px 3px;
          right: 8px;
          top: 8px;
        }

        .post-line::before {
          content: "";
          position: absolute;
          width: 47px;
          height: 9px;
          background-color: #757375;
          top: -8px;
        }

        .screen {
          width: 47px;
          height: 23px;
          background-color: #ffffff;
          position: absolute;
          top: 22px;
          right: 8px;
          border-radius: 3px;
        }

        .numbers {
          width: 12px;
          height: 12px;
          background-color: #838183;
          box-shadow: 0 -18px 0 0 #838183, 0 18px 0 0 #838183;
          border-radius: 2px;
          position: absolute;
          transform: rotate(90deg);
          left: 25px;
          top: 52px;
        }

        .numbers-line2 {
          width: 12px;
          height: 12px;
          background-color: #aaa9ab;
          box-shadow: 0 -18px 0 0 #aaa9ab, 0 18px 0 0 #aaa9ab;
          border-radius: 2px;
          position: absolute;
          transform: rotate(90deg);
          left: 25px;
          top: 68px;
        }

        .dollar {
          position: absolute;
          font-size: 16px;
          font-family: monospace;
          width: 100%;
          left: 0;
          top: 0;
          color: #4b953b;
          text-align: center;
        }

        .payment-card-container:hover .dollar {
          animation: fade-in-fwd 0.3s 1s backwards;
        }

        .payment-modal-footer {
          text-align: center;
          margin-top: 30px;
        }

        .loading-text {
          font-size: 14px;
          color: #666;
          margin-bottom: 15px;
          font-weight: 500;
        }

        .spinner {
          width: 40px;
          height: 40px;
          margin: 0 auto;
          border: 4px solid #f0f0f0;
          border-top: 4px solid #2cc980;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @media (max-width: 640px) {
          .payment-modal-content {
            padding: 24px;
          }

          .payment-card-container {
            height: 120px;
            max-width: 100%;
          }

          .payment-left-side {
            width: 100px;
            height: 120px;
          }

          .payment-amount {
            font-size: 24px;
          }

          .payment-label {
            font-size: 10px;
          }
        }
      `}</style>
      <div className="payment-modal-overlay" onClick={onClose}>
        <div
          className="payment-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="payment-close-btn"
            aria-label="Close modal"
          >
            ✕
          </button>

          <div className="payment-card-container">
            <div className="payment-left-side">
              <div className="card">
                <div className="card-line" />
                <div className="buttons" />
              </div>
              <div className="post">
                <div className="post-line" />
                <div className="screen">
                  <div className="dollar">$</div>
                </div>
                <div className="numbers" />
                <div className="numbers-line2" />
              </div>
            </div>
            <div className="payment-right-side">
              <div className="payment-info">
                <div className="payment-label">Processing Payment</div>
                <div className="payment-amount">GHS {amount.toFixed(2)}</div>
                <div className="payment-method-label">
                  {paymentMethod === "paystack"
                    ? "Via Paystack"
                    : "Manual Transfer"}
                </div>
              </div>
            </div>
          </div>

          <div className="payment-modal-footer">
            <p className="loading-text">
              Please wait while we process your order...
            </p>
            <div className="spinner" />
          </div>
        </div>
      </div>
    </>
  );
}
