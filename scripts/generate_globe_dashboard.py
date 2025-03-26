#!/usr/bin/env python3

import csv
import json
import os
from datetime import datetime

# File paths
CSV_FILE = "combined_holders_no_duplicates.csv"
OUTPUT_HTML = "world8_globe_dashboard.html"

def read_csv_data(csv_file):
    """Read the holder data from the CSV file"""
    holders = []
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                # Convert string values to appropriate types
                holder = {
                    'principal': row['principal'],
                    'daku_count': int(row['daku_count']),
                    'gg_count': int(row['gg_count']),
                    'total_count': int(row['total_count']),
                    'already_in_canister': row['already_in_canister'].lower() == 'true'
                }
                holders.append(holder)
            except (ValueError, KeyError) as e:
                print(f"Error processing row: {row}. Error: {e}")
    
    return holders

def generate_globe_dashboard_html(holders):
    """Generate the globe-style dashboard HTML with all holder data"""
    # Calculate statistics
    total_holders = len(holders)
    total_nfts = sum(h['total_count'] for h in holders)
    total_daku = sum(h['daku_count'] for h in holders)
    total_gg = sum(h['gg_count'] for h in holders)
    avg_nfts = total_nfts / total_holders if total_holders > 0 else 0
    
    # Get top holders
    top_holders = sorted(holders, key=lambda h: h['total_count'], reverse=True)[:5]
    
    # Create holding distribution data for chart
    holding_ranges = [
        {'min': 1, 'max': 10, 'label': '1-10 NFTs'},
        {'min': 11, 'max': 50, 'label': '11-50 NFTs'},
        {'min': 51, 'max': 100, 'label': '51-100 NFTs'},
        {'min': 101, 'max': 500, 'label': '101-500 NFTs'},
        {'min': 501, 'max': float('inf'), 'label': '500+ NFTs'}
    ]
    
    distribution_data = []
    for rng in holding_ranges:
        count = len([h for h in holders if rng['min'] <= h['total_count'] <= rng['max']])
        percent = (count / total_holders * 100) if total_holders > 0 else 0
        distribution_data.append({
            'name': rng['label'],
            'value': round(percent, 1),
            'count': count
        })
    
    # Create staking history (mock data based on real totals)
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    current_month = datetime.now().month
    
    staking_history = []
    for i, month in enumerate(months):
        month_index = (current_month - 5 + i) % 12
        if month_index == 0:
            month_index = 12
        
        # Scale value based on position (just for visual effect)
        scaling_factor = 0.7 + (i * 0.06)
        value = int(total_nfts * scaling_factor)
        
        staking_history.append({
            'month': f"{month} {datetime.now().year}",
            'value': value
        })
    
    # Generate top holders table rows
    top_holders_html = ""
    for i, h in enumerate(top_holders):
        top_holders_html += f"""
                    <tr>
                        <td>#{i+1}</td>
                        <td>{h['principal'][:6]}...{h['principal'][-4:]}</td>
                        <td>{h['total_count']:,}</td>
                    </tr>"""
    
    # Generate distribution table rows
    distribution_html = ""
    for item in distribution_data:
        distribution_html += f"""
                    <tr>
                        <td>{item['name']}</td>
                        <td>{item['value']}%</td>
                        <td>{item['count']}</td>
                    </tr>"""
    
    # Create the HTML content
    dashboard_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>World 8 NFT Staking Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background: #000B1E;
            color: #ffffff;
            overflow: hidden;
        }}

        .dashboard-container {{
            width: 100vw;
            height: 100vh;
            background: black;
            color: #ffffff;
            display: grid;
            grid-template-columns: 350px 1fr 350px;
            grid-template-rows: 80px 1fr 1fr 40px;
            gap: 15px;
            padding: 15px;
            box-sizing: border-box;
            overflow: hidden;
        }}

        .header {{
            grid-column: 1 / -1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            background: rgba(0, 31, 61, 0.3);
            border: 1px solid rgba(0, 102, 204, 0.3);
            border-radius: 4px;
            box-shadow: 0 0 20px rgba(0, 102, 204, 0.1);
        }}

        .header h1 {{
            font-size: 1.5em;
            color: #00ffff;
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        }}

        .header div {{
            color: #00ffff;
            font-size: 0.9em;
        }}

        .panel {{
            background: rgba(0, 31, 61, 0.3);
            border: 1px solid rgba(0, 102, 204, 0.3);
            border-radius: 4px;
            padding: 20px;
            box-shadow: 0 0 20px rgba(0, 102, 204, 0.1);
        }}

        .panel h2 {{
            color: #00ffff;
            font-size: 1.2em;
            margin-bottom: 15px;
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        }}

        .panel div {{
            margin-bottom: 10px;
            color: rgba(255, 255, 255, 0.8);
        }}

        .center-display {{
            grid-column: 2;
            grid-row: 2 / -1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            gap: 20px;
        }}

        .stats-counter {{
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 36px;
            font-weight: bold;
            color: #00ffff;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
            z-index: 1;
            background: rgba(0, 11, 30, 0.7);
            padding: 10px 20px;
            border-radius: 4px;
            border: 1px solid rgba(0, 102, 204, 0.3);
        }}

        .globe-container {{
            width: 100%;
            height: 80%;
            position: relative;
            border: 1px solid rgba(0, 102, 204, 0.5);
            border-radius: 4px;
            background: rgba(0, 11, 30, 0.3);
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
        }}

        .css-globe {{
            width: 300px;
            height: 300px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #001a33, #000B1E);
            position: relative;
            box-shadow: 0 0 60px rgba(0, 255, 255, 0.2);
            animation: rotate 20s linear infinite;
            background-image: 
                radial-gradient(circle at 30% 30%, rgba(0, 255, 255, 0.1), transparent 40%),
                linear-gradient(rgba(0, 255, 255, 0.4) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 255, 0.4) 1px, transparent 1px);
            background-size: 100% 100%, 20px 20px, 20px 20px;
            transform-style: preserve-3d;
        }}

        .css-globe::after {{
            content: '';
            position: absolute;
            top: -20px;
            left: -20px;
            right: -20px;
            bottom: -20px;
            border-radius: 50%;
            border: 2px solid rgba(0, 255, 255, 0.3);
            border-top: 2px solid rgba(0, 255, 255, 0.8);
            border-left: 2px solid rgba(0, 255, 255, 0.8);
            animation: rotate 10s linear infinite;
        }}

        .css-globe::before {{
            content: '';
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            border-radius: 50%;
            border: 1px solid rgba(0, 255, 255, 0.3);
            border-top: 1px solid rgba(0, 255, 255, 0.6);
            border-right: 1px solid rgba(0, 255, 255, 0.6);
            animation: rotate 15s linear infinite reverse;
        }}

        .globe-point {{
            position: absolute;
            width: 4px;
            height: 4px;
            background: #00ffff;
            border-radius: 50%;
            box-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff;
        }}

        @keyframes rotate {{
            0% {{
                transform: rotate(0deg);
            }}
            100% {{
                transform: rotate(360deg);
            }}
        }}

        .point-pulse {{
            animation: pulse 3s infinite;
        }}

        @keyframes pulse {{
            0% {{ transform: scale(1); opacity: 1; }}
            50% {{ transform: scale(1.5); opacity: 0.7; }}
            100% {{ transform: scale(1); opacity: 1; }}
        }}

        .countdown-timer {{
            background: rgba(0, 31, 61, 0.5);
            border: 1px solid rgba(0, 102, 204, 0.5);
            border-radius: 4px;
            padding: 15px 30px;
            text-align: center;
            width: fit-content;
            margin: 0 auto;
        }}

        .countdown-label {{
            color: #00ffff;
            font-size: 1.1em;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}

        .countdown-value {{
            font-size: 1.4em;
            font-weight: bold;
            color: #ffffff;
        }}
            
        .countdown-value span {{
            background: rgba(0, 102, 204, 0.3);
            padding: 6px 12px;
            border-radius: 4px;
            margin: 0 2px;
            min-width: 40px;
            display: inline-block;
        }}
            
        .separator {{
            color: #00ffff;
            margin: 0 4px;
        }}

        .welcome-text {{
            color: #00ffff;
            font-size: 1.5em;
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
            text-align: center;
            margin-bottom: 20px;
        }}

        .footer {{
            grid-column: 1 / -1;
            grid-row: 4;
            display: flex;
            justify-content: center;
            align-items: center;
            background: rgba(0, 31, 61, 0.3);
            border: 1px solid rgba(0, 102, 204, 0.3);
            border-radius: 4px;
            padding: 10px;
            color: #00ffff;
            font-size: 0.9em;
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        }}

        .footer a {{
            color: #00ffff;
            text-decoration: none;
            margin: 0 5px;
        }}
        
        .footer a:hover {{
            text-decoration: underline;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            color: rgba(255, 255, 255, 0.8);
        }}
        
        th, td {{
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }}
        
        th {{
            color: #00ffff;
        }}
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="header">
            <h1>World 8 Staking Dashboard</h1>
            <div id="current-time"></div>
        </div>

        <div class="panel" style="grid-column: 1; grid-row: 2;">
            <h2>Staking Overview</h2>
            <div class="stats-counter" style="position: static; transform: none;">
                {total_nfts:,} NFTs
            </div>
            <div style="margin-top: 20px;">
                <h3 style="color: #00ffff; margin-bottom: 10px;">Key Metrics</h3>
                <div style="color: rgba(255,255,255,0.8);">
                    <div>Total Holders: {total_holders:,}</div>
                    <div>Daku NFTs: {total_daku:,}</div>
                    <div>GG Album NFTs: {total_gg:,}</div>
                    <div>Average Stake: {avg_nfts:.2f} NFTs</div>
                </div>
            </div>
        </div>

        <div class="center-display">
            <div class="welcome-text">Welcome to WORLD 8 Staking</div>
            <div class="countdown-timer">
                <div class="countdown-label">Next Payout In</div>
                <div class="countdown-value">
                    <span id="days">03</span>
                    <span class="separator">:</span>
                    <span id="hours">12</span>
                    <span class="separator">:</span>
                    <span id="minutes">45</span>
                    <span class="separator">:</span>
                    <span id="seconds">00</span>
                </div>
            </div>
            <div class="globe-container" id="globe-container">
                <div class="css-globe">
                    <div class="globe-point point-pulse" style="top: 30%; left: 40%;"></div>
                    <div class="globe-point point-pulse" style="top: 50%; left: 70%; animation-delay: 0.5s;"></div>
                    <div class="globe-point point-pulse" style="top: 70%; left: 30%; animation-delay: 1s;"></div>
                    <div class="globe-point point-pulse" style="top: 20%; left: 60%; animation-delay: 1.5s;"></div>
                    <div class="globe-point point-pulse" style="top: 80%; left: 50%; animation-delay: 2s;"></div>
                    <div class="globe-point point-pulse" style="top: 40%; left: 80%; animation-delay: 2.5s;"></div>
                </div>
            </div>
        </div>

        <div class="panel" style="grid-column: 3; grid-row: 2;">
            <h2>Staking History</h2>
            <div style="position: relative; height: 200px;">
                <canvas id="history-chart"></canvas>
            </div>
        </div>

        <div class="panel" style="grid-column: 1; grid-row: 3;">
            <h2>Top Stakers</h2>
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Address</th>
                        <th>NFTs</th>
                    </tr>
                </thead>
                <tbody>{top_holders_html}
                </tbody>
            </table>
        </div>

        <div class="panel" style="grid-column: 3; grid-row: 3;">
            <h2>NFT Distribution</h2>
            <table>
                <thead>
                    <tr>
                        <th>Range</th>
                        <th>Percentage</th>
                        <th>Stakers</th>
                    </tr>
                </thead>
                <tbody>{distribution_html}
                </tbody>
            </table>
        </div>

        <div class="footer">
            Copyright <a href="http://www.world8.io" target="_blank" rel="noopener noreferrer">WORLD8.io</a>. Created by Muggzie
        </div>
    </div>

    <script>
        // Debug flag for logging
        const DEBUG = true;
        function log(message) {{
            if (DEBUG) {{
                console.log(message);
            }}
        }}
        
        // Update current time
        function updateTime() {{
            document.getElementById('current-time').textContent = new Date().toLocaleString();
        }}
        updateTime();
        setInterval(updateTime, 1000);

        // Set initial target date (5 days from now)
        let targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 5);
        
        // Function to reset the countdown timer
        function resetCountdown() {{
            // Set a new target date 5 days from now
            targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 5);
            console.log("Countdown reset to:", targetDate.toLocaleString());
        }}
        
        // Countdown timer
        function updateCountdown() {{
            try {{
                const now = new Date();
                const timeRemaining = targetDate - now;
                
                if (timeRemaining <= 0) {{
                    // Timer reached zero, reset it
                    resetCountdown();
                    // Update display immediately
                    updateCountdown();
                    return;
                }}
                
                const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
                
                document.getElementById('days').textContent = days.toString().padStart(2, '0');
                document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
                document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
                document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
            }} catch (error) {{
                console.error('Error updating countdown:', error);
            }}
        }}
        
        // Initialize countdown on page load
        document.addEventListener('DOMContentLoaded', function() {{
            updateCountdown();
            // Update countdown every second
            setInterval(updateCountdown, 1000);
        }});

        // Initialize the page
        window.onload = function() {{
            log('Window loaded');
            setTimeout(function() {{
                try {{
                    log('Initializing globe with delay');
                    initGlobe();
                    initHistoryChart();
                }} catch (e) {{
                    console.error('Error initializing components:', e);
                }}
            }}, 500); // Small delay to ensure DOM is fully ready
        }};
        
        // Remove the redundant script loading code
        // Make sure Three.js loads properly
        document.addEventListener('DOMContentLoaded', function() {{
            log('DOM content loaded');
        }});

        // Simplified Globe initialization
        function initGlobe() {{
            log("Initializing globe...");
            
            try {{
                if (typeof THREE === 'undefined') {{
                    console.error('THREE is not defined! Make sure Three.js is loaded correctly.');
                    return;
                }}
                
                const container = document.getElementById('globe-container');
                if (!container) {{
                    console.error("Globe container not found!");
                    return;
                }}
                
                log("Container dimensions:", container.clientWidth, container.clientHeight);
                
                // Clear any existing content
                container.innerHTML = '';
                
                // Create scene
                const scene = new THREE.Scene();
                
                // Create camera
                const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
                camera.position.z = 5;
                
                // Create renderer
                const renderer = new THREE.WebGLRenderer({{ alpha: true, antialias: true }});
                renderer.setSize(container.clientWidth, container.clientHeight);
                renderer.setClearColor(0x000000, 0);
                container.appendChild(renderer.domElement);
                
                // Create simple globe - just a basic wireframe sphere
                const sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
                const sphereMaterial = new THREE.MeshBasicMaterial({{ 
                    color: 0x00ffff,
                    wireframe: true
                }});
                const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                scene.add(sphere);
                
                // Add ambient light
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
                scene.add(ambientLight);
                
                // Add orbit controls if available
                let controls;
                if (typeof THREE.OrbitControls === 'function') {{
                    controls = new THREE.OrbitControls(camera, renderer.domElement);
                    controls.autoRotate = true;
                    controls.autoRotateSpeed = 1;
                }} else {{
                    console.warn('OrbitControls not found');
                }}
                
                // Animation loop
                function animate() {{
                    requestAnimationFrame(animate);
                    
                    // Manual rotation if no controls
                    if (!controls) {{
                        sphere.rotation.y += 0.01;
                    }} else {{
                        controls.update();
                    }}
                    
                    renderer.render(scene, camera);
                }}
                
                // Start animation
                animate();
                log("Globe should be visible now");
                
                // Force a resize to ensure proper dimensions
                window.dispatchEvent(new Event('resize'));
                
            }} catch (error) {{
                console.error('Error in globe initialization:', error);
            }}
        }}
        
        // Initialize staking history chart
        function initHistoryChart() {{
            const ctx = document.getElementById('history-chart').getContext('2d');
            
            const stakingHistory = {json.dumps(staking_history)};
            
            new Chart(ctx, {{
                type: 'line',
                data: {{
                    labels: stakingHistory.map(item => item.month),
                    datasets: [{{
                        label: 'Total Staked',
                        data: stakingHistory.map(item => item.value),
                        borderColor: '#00ffff',
                        backgroundColor: 'rgba(0, 255, 255, 0.1)',
                        tension: 0.3,
                        fill: true
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {{
                        y: {{
                            beginAtZero: true,
                            grid: {{
                                color: 'rgba(255, 255, 255, 0.1)'
                            }},
                            ticks: {{
                                color: '#ffffff'
                            }}
                        }},
                        x: {{
                            grid: {{
                                color: 'rgba(255, 255, 255, 0.1)'
                            }},
                            ticks: {{
                                color: '#ffffff'
                            }}
                        }}
                    }},
                    plugins: {{
                        legend: {{
                            labels: {{
                                color: '#ffffff'
                            }}
                        }}
                    }}
                }}
            }});
        }}
    </script>
</body>
</html>
"""
    
    return dashboard_html

def main():
    print("Processing NFT holder data for globe dashboard...")
    
    # Read holder data from CSV
    holders = read_csv_data(CSV_FILE)
    print(f"Found {len(holders)} holders in the CSV file.")
    
    # Generate dashboard HTML
    dashboard_html = generate_globe_dashboard_html(holders)
    
    # Write HTML to file
    with open(OUTPUT_HTML, 'w') as f:
        f.write(dashboard_html)
    
    print(f"Globe-style dashboard generated as {OUTPUT_HTML}")
    print(f"Open this file in your browser to view the dashboard.")

if __name__ == "__main__":
    main() 