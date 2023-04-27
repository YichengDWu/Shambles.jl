struct TrivialMask end
@inline Base.getindex(::TrivialMask, i) = true

@inline function maksed_copyto!(dest::CuTeArray, src::CuTeArray, mask)
    copy_op = select_elementwise_copy(src, dest) # would select async copy if dest is shared memory and src is global memory
    for i in static(1):size(src.layout)
        if mask[i]
            apply(copy_op, pointer(dest, i), pointer(src, i))
        end
    end
end

@inline function copyto_vec!(dest::CuTeArray{TD}, src::CuTeArray{TS}, ::Type{TV}) where {TD,TS,TV}
    if (sizeof(TD) == sizeof(TS)) && sizeof(TV) > sizeof(TD)
        src_v = recast(TV, src)
        dest_v = recast(TV, dest)
        #print("Vectorized copyto! from $(sizeof(TS)) bytes to $(sizeof(TV))\n bytes")
        maksed_copyto!(dest_v, src_v, TrivialMask())
    else
        maksed_copyto!(dest, src, TrivialMask())
    end
end

# should be used with @gc_preserve if dest or src is powered by an ArrayEngine!
@inline function Base.copyto!(dest::CuTeArray{TD}, src::CuTeArray{TS}) where {TD,TS}

    N = max_common_vector(src, dest)
    if N ≤ 1
        return masked_copyto!(dest, src, TrivialMask())
    else
        vec_bits = N * sizeof(TS) * 8
        TV = uint_bit_t(min(128, vec_bits))
        return copyto_vec!(dest, src, TV)
    end
end
