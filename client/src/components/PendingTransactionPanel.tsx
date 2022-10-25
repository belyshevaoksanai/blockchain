import React from "react"

interface PendingTransactionPanelProps {
  formattedTransactions: string;
  onGenerateBlock: () => void;
  disabled: boolean;
}

export const PendingTransactionPanel: React.FC<PendingTransactionPanelProps> = ({
  formattedTransactions,
  onGenerateBlock,
  disabled,
}) => {
  return (
    <>
      <h2>Pending transactions</h2>
      <pre className="pending-transactions__list">
        {formattedTransactions || 'No pending transactions yet.'}
      </pre>
      <div className="pending-transactions__form">
        <button
          disabled={disabled}
          onClick={() => onGenerateBlock()}
          className="ripple"
          type="button"
        >
          GENERATE BLOCK
        </button>
        <div className="clear"></div>
      </div>
    </>
  )
}