import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios';

export const fetchUserRatings = createAsyncThunk(
  "rating/fetchUserRatings",
  async ({ getToken }, thunkAPI) => {
    try {
      // 🔹 Get authentication token from Clerk
      const token = await getToken();

      // 🔹 Fetch user ratings from backend
      const { data } = await axios.get("/api/rating", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 🔹 Return ratings array safely
      return data?.ratings || [];
    } catch (error) {
      console.error("❌ fetchUserRatings Error:", error);

      // 🔻 Proper error handling
      return thunkAPI.rejectWithValue(
        error?.response?.data || { error: error.message }
      );
    }
  }
);

const ratingSlice = createSlice({
    name: 'rating',
    initialState: {
        ratings: [],
    },
    reducers: {
        addRating: (state, action) => {
            state.ratings.push(action.payload)
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchUserRatings.fulfilled, (state, action) => {
            state.ratings = action.payload
        })
    } 
})

export const { addRating } = ratingSlice.actions

export default ratingSlice.reducer