import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { Button, Select, MenuItem, FormControl, InputLabel, Box, Typography, TextField } from '@mui/material';
import Plot from 'react-plotly.js';
import * as d3 from 'd3';

function App() {
  const [dataPoints, setDataPoints] = useState([]);
  const [centroids, setCentroids] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [initializationMethod, setInitializationMethod] = useState('');
  const [k, setK] = useState(3);
  const [step, setStep] = useState(0);
  const [isConverged, setIsConverged] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  const centroidsRef = useRef(centroids);
  const clustersRef = useRef(clusters);
  const stepRef = useRef(step);
  const isConvergedRef = useRef(isConverged);

  useEffect(() => {
    centroidsRef.current = centroids;
    clustersRef.current = clusters;
    stepRef.current = step;
    isConvergedRef.current = isConverged;
  }, [centroids, clusters, step, isConverged]);

  useEffect(() => {
    generateRandomData();
  }, []);

  const generateRandomData = () => {
    const newData = Array.from({ length: 100 }, () => ({
      x: Math.random() * 10,
      y: Math.random() * 10,
    }));
    setDataPoints(newData);
    resetClustering();
  };

  const resetClustering = () => {
    setCentroids([]);
    setClusters([]);
    setStep(0);
    setIsConverged(false);
    setIsRunning(false);
  };


  const initializeCentroids = () => {
    if (k < 1) {
      alert("Please enter a valid number for clusters (k).");
      return;
    }
    let newCentroids = [];
    switch (initializationMethod) {
      case 'Random':
        newCentroids = d3.shuffle([...dataPoints]).slice(0, k);
        break;
      case 'Farthest First':
        newCentroids = farthestFirstInitialization(dataPoints, k);
        break;
      case 'KMeans++':
        newCentroids = kMeansPlusPlusInitialization(dataPoints, k);
        break;
      case 'Manual':
        // For manual, we'll initialize centroids when the user clicks on the plot
        break;
      default:
        alert("Please select an initialization method.");
        return;
    }
    setCentroids(newCentroids);
    setStep(0);
    setIsConverged(false);
    setIsRunning(false);
  };

  const farthestFirstInitialization = (data, k) => {
    const centroids = [data[Math.floor(Math.random() * data.length)]];
    while (centroids.length < k) {
      let farthest = null;
      let maxDist = -Infinity;
      data.forEach(point => {
        const minDist = Math.min(...centroids.map(c => distance(point, c)));
        if (minDist > maxDist) {
          maxDist = minDist;
          farthest = point;
        }
      });
      centroids.push(farthest);
    }
    return centroids;
  };
  
  const kMeansPlusPlusInitialization = (data, k) => {
    const centroids = [data[Math.floor(Math.random() * data.length)]];
    while (centroids.length < k) {
      const distances = data.map(point =>
        Math.min(...centroids.map(c => distance(point, c)))
      );
      const sumDistances = distances.reduce((a, b) => a + b, 0);
      const probabilities = distances.map(d => d / sumDistances);
      let rand = Math.random();
      let i = 0;
      while (rand > 0) {
        rand -= probabilities[i];
        i++;
      }
      centroids.push(data[i - 1]);
    }
    return centroids;
  };

  const distance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const assignClusters = useCallback(() => {
    const newClusters = dataPoints.map(point => {
      let minDist = Infinity;
      let closestCentroidIndex = -1;
      centroidsRef.current.forEach((centroid, index) => {
        const dist = distance(point, centroid);
        if (dist < minDist) {
          minDist = dist;
          closestCentroidIndex = index;
        }
      });
      return closestCentroidIndex;
    });
    return newClusters;
  }, [dataPoints]);

  const updateCentroids = useCallback((currentClusters) => {
    const newCentroids = centroidsRef.current.map((_, index) => {
      const assignedPoints = dataPoints.filter((_, i) => currentClusters[i] === index);
      if (assignedPoints.length === 0) return centroidsRef.current[index];
      const avgX = d3.mean(assignedPoints, d => d.x);
      const avgY = d3.mean(assignedPoints, d => d.y);
      return { x: avgX, y: avgY };
    });

    const hasConverged = centroidsRef.current.every((c, i) => 
      distance(c, newCentroids[i]) < 0.0001
    );

    return { newCentroids, hasConverged };
  }, [dataPoints]);

  const stepKMeans = useCallback(() => {
    if (isConvergedRef.current || centroidsRef.current.length === 0) {
      return false;
    }

    const newClusters = assignClusters();
    const { newCentroids, hasConverged } = updateCentroids(newClusters);

    setCentroids(newCentroids);
    setClusters(newClusters);
    setStep(prevStep => prevStep + 1);
    setIsConverged(hasConverged);

    return hasConverged;
  }, [assignClusters, updateCentroids]);

  const runToConvergence = useCallback(() => {
    setIsRunning(true);

    const run = () => {
      if (isConvergedRef.current) {
        setIsRunning(false);
        setStep(prevStep => {
          const finalStep = prevStep;
          
          return finalStep;
        });
        return;
      }

      const converged = stepKMeans();
      
      if (!converged) {
        setTimeout(run, 500);
      } else {
        setIsRunning(false);
        setStep(prevStep => {
          const finalStep = prevStep;
         
          return finalStep;
        });
      }
    };

    run();
  }, [stepKMeans, initializationMethod]);

  const handleManualSelection = (event) => {
    console.log("Event points:", event.points);
    
    // Get the x and y from the clicked event
    const clickedPoint = {
      x: event.points.length > 0 ? event.points[0].x : event.x,
      y: event.points.length > 0 ? event.points[0].y : event.y
    };
  
    console.log("Clicked point:", clickedPoint);
    
    // Check if we are in Manual mode
    if (initializationMethod === 'Manual') {
      console.log("Current centroids:", centroids);
      
      // Check if the new centroid already exists
      const exists = centroids.some(centroid => centroid.x === clickedPoint.x && centroid.y === clickedPoint.y);
      console.log("Does the clicked point already exist as centroid?", exists);
      
      // If it doesn't exist, add it; otherwise, return the previous array
      setCentroids(prev => {
        // If it exists, we'll just log and return the previous state
        if (exists) {
          console.log("Clicked an existing centroid, no change made.");
          return prev;
        } else {
          return [...prev, clickedPoint];
        }
      });
    } else {
      console.log("Condition not met for adding new centroid.");
    }
  };
  

const addCentroid = (newCentroid) => {
    setCentroids(prev => {
        console.log("Current centroids:", prev);
        
        const exists = prev.some(centroid => centroid.x === newCentroid.x && centroid.y === newCentroid.y);
        console.log("Does the new centroid already exist?", exists);
        
        return exists ? prev : [...prev, newCentroid];
    });
};



const renderPlot = () => {
  return (
    <Plot
      data={[
        {
          x: dataPoints.map(p => p.x),
          y: dataPoints.map(p => p.y),
          mode: 'markers',
          type: 'scatter',
          marker: { color: clusters.map(c => c !== -1 ? d3.schemeCategory10[c % 10] : 'grey') },
          name: 'Data Points'
        },
        {
          x: centroids.map(c => c.x),
          y: centroids.map(c => c.y),
          mode: 'markers',
          type: 'scatter',
          marker: { color: 'red', symbol: 'x', size: 12 },
          name: 'Centroids'
        },
      ]}
      layout={{ 
        width: 800, 
        height: 600, 
        title: 'KMeans Clustering',
        xaxis: { range: [0, 10], title: 'X' },
        yaxis: { range: [0, 10], title: 'Y' },
        hovermode: 'closest'
      }}
      onClick={handleManualSelection}
      config={{ displayModeBar: false }}
    />
  );
};


  return (
    <Box className="App" sx={{ padding: 3 }}>
      <Typography variant="h5" gutterBottom>
        KMeans Clustering Visualization
      </Typography>
      <Box display="flex" flexDirection="column" gap={2}>
        <FormControl variant="outlined" sx={{ minWidth: 200 }}>
          <InputLabel>Initialization Method</InputLabel>
          <Select
            value={initializationMethod}
            onChange={(e) => {
              setInitializationMethod(e.target.value);
              resetClustering();
            }}
            label="Initialization Method"
          >
            <MenuItem value="Random">Random</MenuItem>
            <MenuItem value="Farthest First">Farthest First</MenuItem>
            <MenuItem value="KMeans++">KMeans++</MenuItem>
            <MenuItem value="Manual">Manual</MenuItem>
          </Select>
        </FormControl>
        <TextField
          type="number"
          label="Number of Clusters (k)"
          value={k}
          onChange={(e) => {
            setK(Math.max(1, parseInt(e.target.value) || 1));
            resetClustering();
          }}
          inputProps={{ min: 1 }}
        />
        <Box display="flex" gap={2}>
          <Button variant="contained" onClick={generateRandomData}>
            Generate New Dataset
          </Button>
          <Button
            variant="contained"
            onClick={initializeCentroids}
            disabled={!initializationMethod || isRunning || (initializationMethod === 'Manual' && centroids.length !== k)}
          >
            Initialize Centroids
          </Button>
          <Button
            variant="contained"
            onClick={stepKMeans}
            disabled={!centroids.length || isConverged || isRunning}
          >
            Step
          </Button>
          <Button
            variant="contained"
            onClick={runToConvergence}
            disabled={!centroids.length || isConverged || isRunning}
          >
            Run to Convergence
          </Button>
          <Button
            variant="contained"
            onClick={resetClustering}
            disabled={isRunning}
          >
            Reset
          </Button>
        </Box>
      </Box>
      {renderPlot()}
      {initializationMethod === 'Manual' && centroids.length < k && (
        <Typography variant="body1" sx={{ marginTop: 2 }}>
          Click anywhere on the plot to add centroids. Remaining: {k - centroids.length}
        </Typography>
      )}
      <Typography variant="h6" sx={{ marginTop: 1 }}>
        Step: {step}
      </Typography>
      {isConverged && (
        <Typography variant="h6" color="green" sx={{ marginTop: 2 }}>
          Clustering has converged in {step} steps!
        </Typography>
      )}
    </Box>
  );
}

export default App;