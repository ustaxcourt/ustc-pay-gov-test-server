(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    document.querySelectorAll("a[data-payment-method][data-payment-status]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        window.alert("No token found — cannot process payment");
      });
    });
    return;
  }

  document.querySelectorAll("a[data-payment-method][data-payment-status]").forEach((link) => {
    link.addEventListener("click", async function (event) {
      event.preventDefault();

      const method = link.getAttribute("data-payment-method");
      const status = link.getAttribute("data-payment-status");
      const redirectUrl = link.getAttribute("href") || "/";

      try {
        const response = await fetch(
          `/pay/${encodeURIComponent(method)}/${encodeURIComponent(status)}?token=${encodeURIComponent(token)}`,
          { method: "POST" }
        );

        if (!response.ok) {
          const message = await response.text();
          window.alert(message || "Unable to process payment");
          return;
        }

        window.location.assign(redirectUrl);
      } catch (error) {
        console.error("Payment request failed", error);
        window.alert("Unable to process payment");
      }
    });
  });
})();
