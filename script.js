// ------ PRISBEREGNING ------
const fixedCosts = 0.9 + 0.092 + 0.076; // = 1.068 kr/kWh

function getTariff(hour) {
    if (hour <= 5) return 0.07;
    if (hour <= 16) return 0.20;
    if (hour <= 20) return 0.61;
    return 0.20;
}

function totalPrice(spot, hour) {
    const tariff = getTariff(hour);
    const total = (spot + fixedCosts + tariff) * 1.25; // med moms
    return Number(total.toFixed(2));
}

// ------ HENT SPOTPRISER ------
async function fetchSpotPrices(dateStr) {
    const url = `https://api.energidataservice.dk/dataset/elspotprices?limit=5000&filter=%7B%22PriceArea%22:%22DK1%22%7D&start=${dateStr}T00:00&end=${dateStr}T23:59`;
    const r = await fetch(url);
    const data = await r.json();
    if (!data.records.length) return null;

    let hours = [];
    for (let h = 0; h < 24; h++) {
        const rec = data.records.find(x => x.HourDK.endsWith(`T${String(h).padStart(2, "0")}:00:00`));
        if (rec) hours[h] = rec.SpotPriceDKK / 1000;
    }
    return hours;
}

// ------ VIS PRISER ------
async function renderPrices(dateObj) {
    const dateStr = dateObj.toISOString().split("T")[0];
    document.getElementById("currentDate").innerText = dateStr;

    const prices = await fetchSpotPrices(dateStr);
    const list = document.getElementById("priceList");
    list.innerHTML = "";

    if (!prices) {
        list.innerHTML = "<p style='text-align:center;font-size:20px;margin-top:20px;'>Ingen data for denne dag</p>";
        return;
    }

    for (let h = 0; h < 24; h++) {
        const p = totalPrice(prices[h], h);

        let color = "green";
        if (p > 2.5) color = "red";
        else if (p > 1.9) color = "yellow";

        const row = document.createElement("div");
        row.className = `price-row ${color}`;
        row.innerHTML = `<strong>${h}:00</strong> <span>${p} kr</span>`;
        list.appendChild(row);
    }

    window.dailyPrices = prices;
}

// ------ BILLIGSTE STARTTIDSPUNKT ------
function calculateBestTime() {
    const duration = Number(document.getElementById("duration").value);
    const manualStart = document.getElementById("startTime").value;
    const resultBox = document.getElementById("resultBox");

    if (!window.dailyPrices) {
        resultBox.innerText = "Ingen data";
        return;
    }

    let bestStart = null;
    let bestTotal = Infinity;

    for (let start = 0; start <= 24 - duration; start++) {
        let sum = 0;
        for (let h = start; h < start + duration; h++) {
            sum += totalPrice(window.dailyPrices[h], h);
        }
        if (sum < bestTotal) {
            bestTotal = sum;
            bestStart = start;
        }
    }

    if (manualStart !== "") {
        resultBox.innerHTML = `Pris fra kl. <strong>${manualStart}:00</strong>:<br><strong>${bestTotal.toFixed(2)} kr</strong>`;
    } else {
        resultBox.innerHTML = `Billigste start: <strong>${bestStart}:00</strong><br>Total pris: <strong>${bestTotal.toFixed(2)} kr</strong>`;
    }
}

// ------ NAVIGATION MELLEM DAGE ------
let currentDate = new Date();

document.addEventListener("DOMContentLoaded", () => {
    renderPrices(currentDate);

    document.getElementById("prevDay").onclick = () => {
        currentDate.setDate(currentDate.getDate() - 1);
        renderPrices(currentDate);
    };

    document.getElementById("nextDay").onclick = () => {
        currentDate.setDate(currentDate.getDate() + 1);
        renderPrices(currentDate);
    };

    const btn = document.getElementById("calcButton");
    if (btn) btn.onclick = calculateBestTime;
});
