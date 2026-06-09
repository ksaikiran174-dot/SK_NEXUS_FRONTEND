import React from 'react';

const PrintableReport = ({ data, settings }) => {
  if (!data) return null;

  return (
    <div id="report-to-print" className="p-8 bg-white text-slate-900 font-sans" style={{ width: '800px' }}>
      {/* Header Section */}
      <div className="border-b-2 border-blue-600 pb-4 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">{settings?.restaurant_name || "RESTAURANT"}</h1>
          <p className="text-blue-600 font-semibold text-lg">15-Day Cycle Performance Report</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>Cycle: {data.startDate} to {data.endDate}</p>
        </div>
      </div>

      {/* Stats Cards (Exactly like your dashboard) */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-700">₹{data.total_sales?.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Total Orders</p>
          <p className="text-2xl font-bold text-slate-800">{data.total_orders}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Online vs Cash</p>
          <p className="text-sm font-bold text-green-600">UPI: ₹{data.online_sales}</p>
          <p className="text-sm font-bold text-orange-600">Cash: ₹{data.cash_sales}</p>
        </div>
      </div>

      {/* Analytics Section (The Charts) */}
      <div className="grid grid-cols-2 gap-8">
        {/* Top Items */}
        <div>
          <h3 className="text-lg font-bold mb-4 border-l-4 border-blue-600 pl-2">Top Selling Items</h3>
          {data.top_items?.map((item, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{item[0]}</span>
                <span>{item[1]} sold</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full" 
                  style={{ width: `${(item[1] / (Math.max(...data.top_items.map(it => it[1])) || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Rush Hours */}
        <div>
          <h3 className="text-lg font-bold mb-4 border-l-4 border-pink-500 pl-2">Peak Hours</h3>
          {data.rush_hours?.map((slot, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{slot[0]} hrs</span>
                <span>{slot[1]} orders</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-pink-500 h-full" 
                  style={{ width: `${(slot[1] / (Math.max(...data.rush_hours.map(s => s[1])) || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrintableReport;