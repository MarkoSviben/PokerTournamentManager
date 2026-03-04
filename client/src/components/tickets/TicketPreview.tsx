import { useRef } from 'react';

interface TicketPreviewProps {
  ticket: {
    id: number;
    ticket_type: string;
    ticket_number?: number;
    amount: number;
    created_at: string;
    player_name?: string;
    table_number?: number;
    seat_number?: number;
    addon_number?: number;
    rebuy_number?: number;
  };
  tournamentName: string;
  startingChips: number;
  onClose: () => void;
}

export default function TicketPreview({ ticket, tournamentName, startingChips, onClose }: TicketPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  let typeLabel = 'BUY-IN';
  if (ticket.ticket_type === 'rebuy') {
    typeLabel = 'RE-BUY';
  } else if (ticket.ticket_type === 'addon') {
    typeLabel = ticket.addon_number ? `ADD-ON #${ticket.addon_number}` : 'ADD-ON';
  }

  const ticketNumber = ticket.ticket_number || ticket.id;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;

    win.document.write(`
      <html><head><title>Ticket #${ticketNumber}</title>
      <style>
        body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 10px 0; }
        .big { font-size: 1.4em; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
      </style></head><body>
        ${content.innerHTML}
        <script>window.print(); window.close();</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white text-black rounded-lg p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div ref={printRef}>
          <div className="text-center mb-3">
            <div className="font-bold text-lg">{tournamentName}</div>
            <div className="text-xs text-gray-500">Poker Tournament Manager</div>
          </div>
          <div className="border-t border-dashed border-gray-400 my-3" />
          <div className="text-center font-bold text-2xl mb-2">{typeLabel}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Ticket #:</span><span className="font-bold">{ticketNumber}</span></div>
            {ticket.player_name && <div className="flex justify-between"><span>Player:</span><span className="font-bold">{ticket.player_name}</span></div>}
            <div className="flex justify-between"><span>Amount:</span><span className="font-bold">{formatMoney(ticket.amount)}</span></div>
            <div className="flex justify-between"><span>Chips:</span><span className="font-bold">{startingChips.toLocaleString()}</span></div>
            {ticket.table_number && <div className="flex justify-between"><span>Table:</span><span>{ticket.table_number}</span></div>}
            {ticket.seat_number && <div className="flex justify-between"><span>Seat:</span><span>{ticket.seat_number}</span></div>}
          </div>
          <div className="border-t border-dashed border-gray-400 my-3" />
          <div className="text-center text-xs text-gray-500">
            {new Date(ticket.created_at).toLocaleString()}
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handlePrint}
            className="flex-1 bg-[var(--casino-dark)] text-white py-2 rounded-lg font-semibold hover:bg-gray-800"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
