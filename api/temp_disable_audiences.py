# Temporary fix - comment out audience endpoints in main.py
# Add this at the top of the audience endpoints to disable them temporarily:

"""
# Temporarily disable audience endpoints until database is ready
@app.get("/audiences") 
async def get_audiences():
    return {"audiences": []}

@app.post("/audiences")
async def create_audience():
    return {"audience": {"id": "temp", "name": "temp"}}

# ... etc for other audience endpoints
"""