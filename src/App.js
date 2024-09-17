import React, { useState, useEffect, useRef } from "react";
import CanvasJSReact from "@canvasjs/react-charts";
import aeroplane from "./assets/Screenshot_2024-09-13_170318-removebg-preview.png";
import img1 from "./assets/178930_poker-chips-png-removebg-preview-removebg-preview (1).jpg";
import img2 from "./assets/images-removebg-preview.png";
import img3 from "./assets/images__1_-removebg-preview (1).png";
import img4 from "./assets/images__2_-removebg-preview.png";
import landingSound from "./Audio/airplane-landing-6732.mp3";
import explosionSound from "./Audio/explosion-42132.mp3";
import backgroundanimation from "./assets/27186-362518474_medium.mp4";
import "./App.css";

var CanvasJSChart = CanvasJSReact.CanvasJSChart;

const App = () => {
  const [balance, setBalance] = useState(1000.0);
  const [betAmount, setBetAmount] = useState(10.0);
  const [multiplier, setMultiplier] = useState(0);
  const [bets, setBets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [dataPoints, setDataPoints] = useState([]);
  const [showFinalMultiplier, setShowFinalMultiplier] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoaderActive, setIsLoaderActive] = useState(false); // New state for loader

  const chartRef = useRef(null); // For referencing the chart for manual updates
  const [currentMultiplier, setCurrentMultiplier] = useState(0); // For plane movement
  const [maxMultiplier, setMaxMultiplier] = useState(0); // Keep track of max multiplier
  const [maxTime, setMaxTime] = useState(0); // Keep track of max time for X-axis

  // Audio elements state
  const [landingAudio, setLandingAudio] = useState(null);
  const [explosionAudio, setExplosionAudio] = useState(null);

  // Initialize and load audio objects once
  useEffect(() => {
    const landingAudioObj = new Audio(landingSound);
    const explosionAudioObj = new Audio(explosionSound);

    landingAudioObj.addEventListener("canplaythrough", () => {
      setLandingAudio(landingAudioObj);
    });

    explosionAudioObj.playbackRate = 1.5; // Set playback rate for explosion
    explosionAudioObj.addEventListener("canplaythrough", () => {
      setExplosionAudio(explosionAudioObj);
    });

    // Clean up event listeners on unmount
    return () => {
      landingAudioObj.removeEventListener("canplaythrough", () => {});
      explosionAudioObj.removeEventListener("canplaythrough", () => {});
    };
  }, []);

  // Play explosion sound when the landing sound ends
  useEffect(() => {
    if (landingAudio) {
      landingAudio.addEventListener("ended", () => {
        explosionAudio?.play();
      });
    }
  }, [landingAudio, explosionAudio]);

  // Play explosion sound when showFinalMultiplier is set to true
  useEffect(() => {
    if (showFinalMultiplier && explosionAudio) {
      explosionAudio.play();
    }
  }, [showFinalMultiplier, explosionAudio]);

  // Generates a random multiplier
  const generateMultiplier = (min = 1.01) => {
    const max = parseFloat((Math.random() * (100 - min) + min).toFixed(2)); // Random max between min and 100
    setMaxMultiplier(max); // Set max multiplier for Y-axis scaling
    return parseFloat((Math.random() * (max - min) + min).toFixed(2)); // Generate random multiplier between min and max
  };

  const placeBet = () => {
    if (
      betAmount > 0 &&
      betAmount <= balance &&
      landingAudio &&
      !isLoaderActive
    ) {
      // Play the landing sound
      landingAudio.play();

      setBalance((prevBalance) => prevBalance - betAmount);
      setIsLoading(true);
      setMultiplier(0);
      setHasCashedOut(false);
      setDataPoints([]);
      setShowFinalMultiplier(false);

      const newMultiplier = generateMultiplier();
      const increment = newMultiplier / 50; // Adjust increments for faster animation
      let currentTime = 0;
      const totalTime = 3000; // Reduce max time for the X-axis to make animation faster
      setMaxTime(totalTime); // Set max time for X-axis scaling

      // Reset plane animation
      const plane = document.querySelector(".plane");
      plane.classList.remove("plane-hidden"); // Ensure plane is visible at the start
      plane.style.transition = "none";
      plane.style.left = "0%";
      plane.style.bottom = "0%";
      const dummy = plane.offsetHeight; // Trigger reflow
      plane.style.transition = "left 0.03s linear, bottom 0.03s linear"; // Smooth transition for both properties

      const loadingInterval = setInterval(() => {
        setMultiplier((prev) => {
          const nextMultiplier = prev + increment;
          currentTime += 30; // Increase interval timing for slower updates

          // Update chart's data points and re-render
          setDataPoints((prevData) => [
            ...prevData,
            { x: currentTime, y: nextMultiplier },
          ]);

          if (chartRef.current) {
            chartRef.current.render(); // Manually re-render the chart for smooth animation
          }

          setCurrentMultiplier(nextMultiplier); // Update plane position

          // Update plane position based on currentMultiplier
          const planePositionX = (currentTime / totalTime) * 100; // Calculate percentage for plane position
          const planePositionY = (nextMultiplier / maxMultiplier) * 100; // Calculate percentage for plane position
          plane.style.left = `${planePositionX}%`;
          plane.style.bottom = `${planePositionY}%`;

          if (nextMultiplier >= newMultiplier) {
            clearInterval(loadingInterval);
            setMultiplier(newMultiplier);
            setIsLoading(false);
            setShowFinalMultiplier(true);

            // Stop the landing audio
            landingAudio.pause();
            landingAudio.currentTime = 0;

            // Play the explosion sound immediately
            explosionAudio?.play();

            // Hide the plane
            plane.classList.add("plane-hidden");

            setIsResetting(true);

            setTimeout(() => {
              setShowFinalMultiplier(false);
              setDataPoints([]); // Reset data points after showing final multiplier
              setIsResetting(false); // End resetting
              setIsLoaderActive(true); // Activate loader

              setTimeout(() => {
                setIsLoaderActive(false);
                // Re-show the plane after loader finishes
                plane.classList.remove("plane-hidden");
              }, 1000);
            }, 2000);
          }
          return nextMultiplier;
        });
      }, 50); // Increase interval timing for slower updates
    } else {
      alert("Insufficient balance or invalid bet amount!");
    }
  };

  const cashOut = () => {
    if (!hasCashedOut && multiplier > 0) {
      const winnings = betAmount * multiplier;
      setBalance((prevBalance) => prevBalance + winnings);
      setBets((prevBets) => [
        ...prevBets,
        { user: "User", amount: betAmount, multiplier, winnings },
      ]);
      setHasCashedOut(true);
    }
  };

  useEffect(() => {
    // Fetch user balance and bet history from a backend API here
  }, []);

  // Chart options with dynamic X and Y axis limits
  const chartOptions = {
    theme: "light2",
    title: {
      text: "Multiplier Chart",
    },
    axisX: {
      title: "Time (ms)",
      maximum: maxTime, // Dynamically set the maximum value for the X-axis
    },
    axisY: {
      title: "Multiplier (x)",
      includeZero: false,
      minimum: 0,
      maximum: maxMultiplier, // Dynamically set the maximum value for the Y-axis
    },
    data: [
      {
        type: "line",
        xValueFormatString: "#,##0 ms",
        yValueFormatString: "0.00x",
        animationEnabled: true, // Enable chart animation
        markerSize: 5, // Set marker size to a small value
      },
      {
        type: "area", // Change to 'area' to fill the bottom gap
        xValueFormatString: "#,##0 ms",
        yValueFormatString: "0.00x",
        dataPoints: dataPoints,
        animationEnabled: true, // Enable chart animation
        lineColor: "red", // Red line for animation
        markerType: "aeroplane", // Change marker type to circle
        markerSize: 5, // Set marker size to a small value
        fillOpacity: 0.5, // Adjust opacity as needed
        color: "red", // Fill color for the bottom gap
      },
    ],
  };

  // Calculate plane position dynamically
  const planeStyle = {
    left: dataPoints.length
      ? `${(dataPoints[dataPoints.length - 1].x / maxTime) * 100}%`
      : "0%",
    bottom: dataPoints.length
      ? `${(dataPoints[dataPoints.length - 1].y / maxMultiplier) * 100}%`
      : "0%",
    transform: "translate(-50%, -100%)", // Adjust to position the plane above the chart line
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="balance">
          <span className="balance-label">Balance:</span>
          <span className="balance-amount">{balance.toFixed(2)}INR</span>
        </div>
        <h1 className="app-title">Aviator</h1>
        <span className="how-to-play">How to play?</span>
      </header>
      <main className="app-main">
        {isLoaderActive && <div className="loader">Loading...</div>}{" "}
        {/* Loader */}
        <div className="game-area">
          <div className="chart-container" style={{ position: "relative" }}>
            {/* Video Background */}
            <video
              autoPlay
              loop
              muted
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 1,
                opacity: 0.5,
              }}
            >
              <source src={backgroundanimation} type="video/mp4" />
            </video>
            {!isLoading && multiplier > 0 && !hasCashedOut && isResetting && (
              <div className="plane-flew-away">Plane has flown away!</div>
            )}
            <CanvasJSChart options={chartOptions} ref={chartRef} />
            {/* Plane Animation */}
            <img
              src={aeroplane}
              alt="Plane"
              className="plane"
              style={planeStyle}
            />
          </div>

          <div className="multiplier">
            {isLoading ? (
              <div className="loading">{multiplier.toFixed(2)}x</div>
            ) : (
              <h1>
                {hasCashedOut
                  ? multiplier.toFixed(2) + "x"
                  : multiplier > 0
                  ? multiplier.toFixed(2) + "x"
                  : ""}
              </h1>
            )}
          </div>
        </div>
        <div className="bet-area">
          <div className="bets-history">
            <h2>Bet History</h2>
            <ul>
              {bets.map((bet, index) => (
                <li key={index}>
                  <span className="user">{bet.user}</span>
                  <span className="amount">{bet.amount} INR</span>
                  <span className="multiplier">
                    {bet.multiplier.toFixed(2)}x
                  </span>
                  <span className="winnings">
                    {bet.winnings.toFixed(2)} INR
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bet-controls">
            <div className="bet-input">
              <label htmlFor="bet-amount">Bet Amount:</label>
              <input
                type="text"
                id="bet-amount"
                value={betAmount}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setBetAmount(isNaN(value) ? 0 : value);
                }}
              />
            </div>
            <div className="preset-buttons">
              {[10].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount((prev) => prev + amount)}
                  style={{ cursor: "pointer" }}
                >
                  <img src={img4} alt="Bet 10" />
                </button>
              ))}
              {[20].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount((prev) => prev + amount)}
                  style={{ cursor: "pointer" }}
                >
                  <img src={img1} alt="Bet 20" />
                </button>
              ))}
              {[50].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount((prev) => prev + amount)}
                  style={{ cursor: "pointer" }}
                >
                  <img src={img2} alt="Bet 50" />
                </button>
              ))}
              {[100].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount((prev) => prev + amount)}
                  style={{ cursor: "pointer" }}
                >
                  <img src={img3} alt="Bet 100" />
                </button>
              ))}
            </div>
            <button
              onClick={isLoading ? cashOut : placeBet}
              disabled={
                isLoading
                  ? multiplier <= 0 || hasCashedOut
                  : isResetting || isLoaderActive
              } // Disable button during loader
            >
              {isLoading ? "Cash out" : "Place Bet"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
