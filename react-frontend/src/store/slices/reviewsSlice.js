import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { reviewsApi } from '../../services/api.js'

export const fetchMyReviews = createAsyncThunk('reviews/fetchMine', () => reviewsApi.mine())
export const fetchProviderReviews = createAsyncThunk('reviews/fetchForProvider', () => reviewsApi.forProvider())
export const fetchListingReviews = createAsyncThunk('reviews/fetchForListing', (listingId) => reviewsApi.forListing(listingId))
export const saveReview = createAsyncThunk('reviews/save', ({ bookingId, review }) => reviewsApi.save(bookingId, review))

const list = (value) => (Array.isArray(value) ? value : [])

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState: { mine: [], provider: null, providerStatus: 'idle', providerError: '', byListingId: {} },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyReviews.fulfilled, (state, action) => { state.mine = list(action.payload) })
      .addCase(fetchMyReviews.rejected, (state) => { state.mine = [] })
      .addCase(fetchProviderReviews.pending, (state) => { state.providerStatus = 'loading'; state.providerError = '' })
      .addCase(fetchProviderReviews.fulfilled, (state, action) => { state.providerStatus = 'succeeded'; state.provider = action.payload })
      .addCase(fetchProviderReviews.rejected, (state, action) => { state.providerStatus = 'failed'; state.providerError = action.error.message })
      .addCase(fetchListingReviews.fulfilled, (state, action) => { state.byListingId[action.meta.arg] = list(action.payload?.reviews) })
      .addCase(saveReview.fulfilled, (state, action) => {
        state.mine = [...state.mine.filter((review) => review.bookingId !== action.payload.bookingId), action.payload]
      })
  },
})

const byBooking = (reviews) => Object.fromEntries(list(reviews).map((review) => [review.bookingId, review]))

export const selectMyReviewsByBooking = createSelector([(state) => state.reviews.mine], byBooking)
export const selectProviderReviewsByBooking = createSelector([(state) => state.reviews.provider?.reviews], byBooking)

export default reviewsSlice.reducer
