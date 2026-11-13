const translations = {
  es: {
    intro: "Calcula tu cuota mensual y consulta tu plan de pagos.",
    language: "Idioma",
    amount: "Monto del préstamo",
    rate: "Tasa de interés (%)",
    rateType: "Tipo de tasa",
    monthly: "Efectiva mensual",
    annual: "Efectiva anual",
    months: "Plazo en meses",
    calculate: "Calcular préstamo",
    result: "Resultado del préstamo",
    payment: "Cuota mensual",
    totalInterest: "Total de intereses",
    totalPaid: "Total a pagar",
    schedule: "Tabla de amortización",
    month: "Mes",
    installment: "Cuota",
    interest: "Interés",
    principal: "Abono a capital",
    balance: "Saldo pendiente",
    print: "Imprimir",
    pdf: "Descargar PDF",
    invalid: "Revisa el monto, la tasa y el plazo.",
    tooLarge: "Los valores son demasiado grandes.",
    pdfError: "No se pudo generar el PDF. Revisa tu conexión y recarga la página."
  },
  en: {
    intro: "Calculate your monthly payment and view your repayment plan.",
    language: "Language",
    amount: "Loan amount",
    rate: "Interest rate (%)",
    rateType: "Interest rate type",
    monthly: "Effective monthly",
    annual: "Effective annual",
    months: "Term in months",
    calculate: "Calculate loan",
    result: "Loan results",
    payment: "Monthly payment",
    totalInterest: "Total interest",
    totalPaid: "Total repayment",
    schedule: "Amortization schedule",
    month: "Month",
    installment: "Payment",
    interest: "Interest",
    principal: "Principal repayment",
    balance: "Remaining balance",
    print: "Print",
    pdf: "Download PDF",
    invalid: "Check the amount, interest rate and term.",
    tooLarge: "The values are too large.",
    pdfError: "Could not generate the PDF. Check your connection and reload the page."
  }
};

const form = document.getElementById("loan-form");
const results = document.getElementById("results");
const error = document.getElementById("error");
const schedule = document.getElementById("schedule");

let language = "es";
let simulation = null;
let errorKey = "";

function format(value) {
  return value.toLocaleString(
    language === "es" ? "es-CO" : "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

function details() {
  const t = translations[language];

  return `${t.amount}: ${format(simulation.amount)} | ` +
    `${t.rate}: ${simulation.rate} | ` +
    `${t[simulation.rateType]} | ` +
    `${t.months}: ${simulation.months}`;
}

function renderResults() {
  schedule.replaceChildren();
  results.hidden = simulation === null;

  if (!simulation) return;

  document.getElementById("details").textContent = details();
  document.getElementById("payment").textContent =
    format(simulation.payment);
  document.getElementById("total-interest").textContent =
    format(simulation.totalInterest);
  document.getElementById("total-paid").textContent =
    format(simulation.totalPaid);

  const fragment = document.createDocumentFragment();

  for (const values of simulation.rows) {
    const row = document.createElement("tr");

    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = index === 0 ? value : format(value);
      row.appendChild(cell);
    });

    fragment.appendChild(row);
  }

  schedule.appendChild(fragment);
}

function applyLanguage() {
  document.documentElement.lang = language;

  document.querySelectorAll("[data-text]").forEach(element => {
    element.textContent =
      translations[language][element.dataset.text];
  });

  error.textContent = errorKey
    ? translations[language][errorKey]
    : "";

  renderResults();
}

document.getElementById("language")
  .addEventListener("change", function () {
    language = this.value;
    applyLanguage();
  });

form.addEventListener("submit", function (event) {
  event.preventDefault();

  simulation = null;
  errorKey = "";
  error.textContent = "";
  renderResults();

  const amount = Number(document.getElementById("amount").value);
  const rate = Number(document.getElementById("rate").value);
  const months = Number(document.getElementById("months").value);
  const rateType = document.getElementById("rate-type").value;

  if (
    !Number.isFinite(amount) ||
    !Number.isFinite(rate) ||
    amount <= 0 ||
    rate < 0 ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 1200
  ) {
    errorKey = "invalid";
    applyLanguage();
    return;
  }

  const monthlyRate = rateType === "annual"
    ? Math.expm1(Math.log1p(rate / 100) / 12)
    : rate / 100;

  const payment = monthlyRate === 0
    ? amount / months
    : amount * monthlyRate /
      (-Math.expm1(-months * Math.log1p(monthlyRate)));

  if (!Number.isFinite(payment)) {
    errorKey = "tooLarge";
    applyLanguage();
    return;
  }

  let balance = amount;
  let totalInterest = 0;
  let totalPaid = 0;
  const rows = [];

  for (let month = 1; month <= months; month++) {
    const interest = balance * monthlyRate;

    const principal = month === months
      ? balance
      : Math.min(balance, Math.max(0, payment - interest));

    const currentPayment = principal + interest;

    balance = Math.max(0, balance - principal);
    totalInterest += interest;
    totalPaid += currentPayment;

    rows.push([
      month,
      currentPayment,
      interest,
      principal,
      balance
    ]);
  }

  simulation = {
    amount,
    rate,
    rateType,
    months,
    payment,
    totalInterest,
    totalPaid,
    rows
  };

  renderResults();
});

document.getElementById("print-button")
  .addEventListener("click", () => {
    if (simulation) window.print();
  });

document.getElementById("pdf-button")
  .addEventListener("click", () => {
    if (!simulation) return;

    try {
      const t = translations[language];
      const doc = new window.jspdf.jsPDF();

      doc.setFontSize(20);
      doc.text("Loan Simulator", 14, 20);
      doc.setFontSize(10);

      const lines = doc.splitTextToSize(details(), 180);
      doc.text(lines, 14, 30);

      const y = 30 + lines.length * 5 + 7;

      doc.text(
        `${t.payment}: ${format(simulation.payment)}`,
        14, y
      );

      doc.text(
        `${t.totalInterest}: ${format(simulation.totalInterest)}`,
        14, y + 7
      );

      doc.text(
        `${t.totalPaid}: ${format(simulation.totalPaid)}`,
        14, y + 14
      );

      doc.autoTable({
        startY: y + 23,
        head: [[
          t.month,
          t.installment,
          t.interest,
          t.principal,
          t.balance
        ]],
        body: simulation.rows.map(row =>
          row.map((value, index) =>
            index === 0 ? value : format(value)
          )
        ),
        theme: "striped",
        headStyles: { fillColor: [23, 43, 77] },
        styles: { fontSize: 9 },
        margin: {
          top: 15,
          right: 14,
          bottom: 15,
          left: 14
        }
      });

      doc.save("loan-simulator.pdf");
      errorKey = "";
      error.textContent = "";
    } catch (problem) {
      errorKey = "pdfError";
      error.textContent = translations[language][errorKey];
    }
  });

applyLanguage();