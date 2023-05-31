# MoYe

[![Stable](https://img.shields.io/badge/docs-stable-blue.svg)](https://YichengDWu.github.io/MoYe.jl/stable/)
[![Dev](https://img.shields.io/badge/docs-dev-blue.svg)](https://YichengDWu.github.io/MoYe.jl/dev/)
[![Build Status](https://github.com/YichengDWu/MoYe.jl/actions/workflows/CI.yml/badge.svg?branch=main)](https://github.com/YichengDWu/MoYe.jl/actions/workflows/CI.yml?query=branch%3Amain)
[![Coverage](https://codecov.io/gh/YichengDWu/MoYe.jl/branch/main/graph/badge.svg)](https://codecov.io/gh/YichengDWu/MoYe.jl)

The `MoYe.jl` library draws significant inspiration from NVIDIA's [CuTe](https://github.com/NVIDIA/cutlass/blob/main/media/docs/cute/00_quickstart.md) and is built with similar underlying structures.

The name **Mo Ye** is derived from an ancient Chinese [legend of swordsmiths](https://en.wikipedia.org/wiki/Gan_Jiang_and_Mo_Ye).

## Installation
```julia
pkg> add MoYe
```

## Quick Start
```julia
julia> data = [i for i in 1:48];
julia> a = MoYeArray(pointer(data), @Layout((6,8)))
6×8 MoYeArray{Int64, 2, ViewEngine{Int64, Ptr{Int64}}, Layout{2, Tuple{Static.StaticInt{6}, Static.StaticInt{8}}, Tuple{Static.StaticInt{1}, Static.StaticInt{6}}}}:
 1   7  13  19  25  31  37  43
 2   8  14  20  26  32  38  44
 3   9  15  21  27  33  39  45
 4  10  16  22  28  34  40  46
 5  11  17  23  29  35  41  47
 6  12  18  24  30  36  42  48

julia> subtile_a = @tile a static((3,4)) (1, 2) # partition a into subtiles of shape 3 x 4, returns the subtile at (1,2)
3×4 MoYeArray{Int64, 2, ViewEngine{Int64, Ptr{Int64}}, Layout{2, Tuple{Static.StaticInt{3}, Static.StaticInt{4}}, Tuple{Static.StaticInt{1}, Static.StaticInt{6}}}}:
 25  31  37  43
 26  32  38  44
 27  33  39  45

julia> workitems_a = @parallelize subtile_a static((3,2)) (1,1) # 3 x 2 threads, returns what thread (1,1) is working on
1×2 MoYeArray{Int64, 2, ViewEngine{Int64, Ptr{Int64}}, Layout{2, Tuple{Static.StaticInt{1}, Static.StaticInt{2}}, Tuple{Static.StaticInt{0}, Static.StaticInt{12}}}}:
 25  37

julia> for i in eachindex(workitems_a)
           workitems_a[i] = 0
       end

julia> a
6×8 MoYeArray{Int64, 2, ViewEngine{Int64, Ptr{Int64}}, Layout{2, Tuple{Static.StaticInt{6}, Static.StaticInt{8}}, Tuple{Static.StaticInt{1}, Static.StaticInt{6}}}}:
 1   7  13  19   0  31   0  43
 2   8  14  20  26  32  38  44
 3   9  15  21  27  33  39  45
 4  10  16  22  28  34  40  46
 5  11  17  23  29  35  41  47
 6  12  18  24  30  36  42  48
 
 julia> @tile subtile_a static((3,1)) (1, 2) # if you want, you can always tile a subtile
3×1 MoYeArray{Int64, 2, ViewEngine{Int64, Ptr{Int64}}, Layout{2, Tuple{Static.StaticInt{3}, Static.StaticInt{1}}, Tuple{Static.StaticInt{1}, Static.StaticInt{0}}}}:
 31
 32
 33
 ```
 
 # Current Status
 
 `Vectorized Copy & copy_async`: Array-Level Support - see [cucopyto!](https://github.com/YichengDWu/MoYe.jl/blob/main/src/algorithm/copy.jl#L36)
 
 `ldmatrix`: Arch-Level Support - see [ldmatrix](https://github.com/YichengDWu/MoYe.jl/blob/main/src/arch/copy/ldmatrix.jl#L18)
 
 `Tensor Core MMA`: Traits-Level Support - see [mma_unpack](https://github.com/YichengDWu/MoYe.jl/blob/main/test/device/mmatraits.jl#L67)
 
One of the future goals for this project is to enhance the copy operations and mma to Atom-Level Support. For an explanation of terms such as Arch-Level, Traits-Level, and Atom-Level, please refer to NVIDIA's [CuTe](https://github.com/NVIDIA/cutlass/blob/main/media/docs/cute/0t_mma_atom.md) documentation. The development of higher-level APIs has been paused due to lack of spare time, but remains a future ambition for the project when it resumes. Contributions from the community are very much welcome and encouraged. If you're interested in helping out, please don't hesitate to get in touch or submit a pull request. 

## Notes on WMMA

Supporting WMMA is not a priority for MoYe, it is considered an outdated class of API.
