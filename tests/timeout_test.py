"""
Test timeout implementation approach before modifying campaign manager
"""

import concurrent.futures
import time

def phase_work():
    """Simulated phase work"""
    for i in range(10):
        print(f"Working... {i}")
        time.sleep(1)
    return {"result": "completed"}

def execute_with_timeout(phase_func, timeout_seconds):
    """Execute a phase with timeout"""
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(phase_func)
        try:
            result = future.result(timeout=timeout_seconds)
            print(f"✅ Phase completed: {result}")
            return result
        except concurrent.futures.TimeoutError:
            print(f"❌ Phase timed out after {timeout_seconds}s")
            raise TimeoutError(f"Phase exceeded {timeout_seconds} second timeout")

if __name__ == "__main__":
    print("Test 1: Phase completes within timeout")
    try:
        result = execute_with_timeout(phase_work, 15)  # Should succeed
        print(f"Result: {result}")
    except TimeoutError as e:
        print(f"Timeout: {e}")

    print("\nTest 2: Phase exceeds timeout")
    try:
        result = execute_with_timeout(phase_work, 5)  # Should timeout
        print(f"Result: {result}")
    except TimeoutError as e:
        print(f"Timeout: {e}")
