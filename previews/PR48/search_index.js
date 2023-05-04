var documenterSearchIndex = {"docs":
[{"location":"manual/datamovement/gs/#Matrix-Transpose-Tutorial","page":"Global Memory & Shared Memory","title":"Matrix Transpose Tutorial","text":"","category":"section"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"This tutorial illustrates the process copying data between global memory and shared memory using MoYe. ","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"In this tutorial, we will use the following configuration:","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"Array size: 2048 x 2048\nBlock size: 32 x 32\nThread size: 32 x 8","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"We start with a copy kernel.","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"using MoYe, Test, CUDA\n\nfunction copy_kernel(dest, src, smemlayout, blocklayout, threadlayout)\n    smem = MoYe.SharedMemory(eltype(dest), cosize(smemlayout))\n    moye_smem = MoYeArray(smem, smemlayout)\n\n    moye_dest = MoYeArray(dest)\n    moye_src = MoYeArray(src)\n\n    bM = size(blocklayout, 1)\n    bN = size(blocklayout, 2)\n\n    blocktile_dest = @tile moye_dest (bM, bN) (blockIdx().x, blockIdx().y)\n    blocktile_src  = @tile moye_src  (bM, bN) (blockIdx().x, blockIdx().y)\n\n    threadtile_dest = @parallelize blocktile_dest threadlayout threadIdx().x\n    threadtile_src  = @parallelize blocktile_src  threadlayout threadIdx().x\n    threadtile_smem = @parallelize moye_smem      threadlayout threadIdx().x\n\n    for i in eachindex(threadtile_smem)\n        threadtile_smem[i] = threadtile_src[i]\n    end\n    \n    for i in eachindex(threadtile_dest)\n        threadtile_dest[i] = threadtile_smem[i]\n    end\n    return nothing\nend\n\nfunction test_copy_async(M, N)\n    a = CUDA.rand(Float32, M, N)\n    b = CUDA.rand(Float32, M, N)\n\n    blocklayout = @Layout (32, 32) # 32 * 32 elements in a block\n    smemlayout = @Layout (32, 32)  # 32 * 32 elements in shared memory\n    threadlayout = @Layout (32, 8) # 32 * 8 threads in a block\n\n    bM = size(blocklayout, 1)\n    bN = size(blocklayout, 2)\n\n    blocks = (cld(M, bM), cld(N, bN))\n    threads = MoYe.dynamic(size(threadlayout))\n\n    @cuda blocks=blocks threads=threads copy_kernel(a, b, smemlayout, blocklayout, threadlayout)\n    CUDA.synchronize()\n    @test a == b\nend\n\n test_copy_async(2048, 2048)","category":"page"},{"location":"manual/datamovement/gs/#Code-Explanation","page":"Global Memory & Shared Memory","title":"Code Explanation","text":"","category":"section"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"The device function follows these steps:","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"Allocate shared memory using MoYe.SharedMemory.\nWrap the shared memory with MoYeArray with a static layout and destination, and source arrays with dynamic layouts.\nGet the size of each block in the grid (bM and bN).\nCreate local tiles for the destination and source arrays using @tile.\nPartition the local tiles into thread tiles using @parallelize.\nCopy data from the source thread tile to the shared memory thread tile.\nSynchronize threads.\nCopy data back from the shared memory thread tile to the destination thread tile.","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"The host function tests the copy_kernel function with the following steps:","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"Define the dimensions M and N for the source and destination arrays.\nCreate random GPU arrays a and b with the specified dimensions using CUDA.rand.\nDefine the block and thread layouts using @Layout for creating static layouts.\nCalculate the number of blocks in the grid using cld. Here we assume the divisibility.","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"A few things to notice here:","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"@tile means that all of our blocks cover the entire array.\nEach block contains 32 x 32 elements of the original array, but we have 32 x 8 threads per block, which means that each thread processes 4 elements. The code","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"@parallelize blocktile_dest threadlayout threadIdx().x","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"returns the set of elements that the thread corresponding to threadIdx().x is processing, which in this case is an array of length 4.","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"Once we have completed all the tiling, we just perform computations as if we were dealing with a regular array:","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"for i in eachindex(threadtile_smem)\n    threadtile_smem[i] = threadtile_src[i]\nend","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"You need not concern yourself with index bookkeeping, it is implicitly handled by the layout; instead, concentrate on the computation aspect, as it is a fundamental objective of MoYe.jl.","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"Additionally, you can use the cucopyto! function, which is similar to copyto!, but with two key differences: copying from global memory to shared memory automatically calls cp.async (Requires sm_80 or higher), and automatic vectorization when possible.","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"Here is how it would look like using cucopyto!.","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"function copy_kernel(dest, src, smemlayout, blocklayout, threadlayout)\n    smem = MoYe.SharedMemory(eltype(dest), cosize(smemlayout))\n    moye_smem = MoYeArray(smem, smemlayout)\n\n    moye_dest = MoYeArray(dest)\n    moye_src = MoYeArray(src)\n\n    bM = size(blocklayout, 1)\n    bN = size(blocklayout, 2)\n\n    blocktile_dest = @tile moye_dest (bM, bN) (blockIdx().x, blockIdx().y)\n    blocktile_src  = @tile moye_src  (bM, bN) (blockIdx().x, blockIdx().y)\n\n    threadtile_dest = @parallelize blocktile_dest threadlayout threadIdx().x\n    threadtile_src  = @parallelize blocktile_src  threadlayout threadIdx().x\n    threadtile_smem = @parallelize moye_smem      threadlayout threadIdx().x\n\n    cucopyto!(threadtile_smem, threadtile_src)\n    cp_async_wait()\n    cucopyto!(threadtile_dest, threadtile_smem)\n\n    return nothing\nend","category":"page"},{"location":"manual/datamovement/gs/#Padding-Shared-Memory","page":"Global Memory & Shared Memory","title":"Padding Shared Memory","text":"","category":"section"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"Note that in the above code, the layout of the shared memory is the same as the block layout. However, we often need to pad the shared array to avoid bank conflicts. We just need to change one line of code:","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"smemlayout = @Layout (32, 32) (1, 31)  # pad one row","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"Also note that our kernel will recompile for different static layout parameters.","category":"page"},{"location":"manual/datamovement/gs/#Transpose-kernel","page":"Global Memory & Shared Memory","title":"Transpose kernel","text":"","category":"section"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"Now we turn to the transpose kernel.","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"function transpose_kernel(dest, src, smemlayout, blocklayout, threadlayout)\n    smem = MoYe.SharedMemory(eltype(dest), cosize(smemlayout))\n    moye_smem = MoYeArray(smem, smemlayout)\n\n    moye_src = MoYeArray(src)\n    moye_dest = MoYeArray(dest)\n\n    bM = size(blocklayout, 1)\n    bN = size(blocklayout, 2)\n\n    blocktile_src  = @tile moye_src  (bM, bN) (blockIdx().x, blockIdx().y)\n    blocktile_dest = @tile moye_dest (bN, bM) (blockIdx().y, blockIdx().x)\n\n    threadtile_dest = @parallelize blocktile_dest threadlayout threadIdx().x\n    threadtile_src  = @parallelize blocktile_src  threadlayout threadIdx().x\n    threadtile_smem = @parallelize moye_smem      threadlayout threadIdx().x\n\n    cucopyto!(threadtile_smem, threadtile_src)\n    cp_async_wait()\n    sync_threads()\n\n    moye_smem′ = MoYeArray(smem, transpose(smemlayout))\n    threadtile_smem′ = @parallelize moye_smem′ threadlayout threadIdx().x\n\n    cucopyto!(threadtile_dest, threadtile_smem′)\n    return nothing\nend\n\n\nfunction test_transpose(M, N)\n    a = CUDA.rand(Float32, M, N)\n    b = CUDA.rand(Float32, N, M)\n\n    blocklayout = @Layout (32, 32)\n    smemlayout = @Layout (32, 32) (1, 33)\n    threadlayout = @Layout (32, 8)\n\n    bM = size(blocklayout, 1)\n    bN = size(blocklayout, 2)\n\n    blocks = (cld(M, bM), cld(N, bN))\n    threads = MoYe.dynamic(size(threadlayout))\n\n    @cuda blocks=blocks threads=threads transpose_kernel(a, b, smemlayout, blocklayout, threadlayout)\n    CUDA.synchronize()\n    @test a == transpose(b)\nend\n\ntest_transpose(2048, 2048)","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"It is almost identical to the copy kernel， but we would need to transpose the shared memory by simply transposing its layout","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"moye_smem′ = MoYeArray(smem, transpose(smemlayout))","category":"page"},{"location":"manual/datamovement/gs/","page":"Global Memory & Shared Memory","title":"Global Memory & Shared Memory","text":"and then compute the new thread tiles. Note that each thread would work on different elements now so we need to call sync_threads().","category":"page"},{"location":"api/array/#MoYeArray","page":"MoYeArray","title":"MoYeArray","text":"","category":"section"},{"location":"api/array/","page":"MoYeArray","title":"MoYeArray","text":"CurrentModule = MoYe","category":"page"},{"location":"api/array/#Index","page":"MoYeArray","title":"Index","text":"","category":"section"},{"location":"api/array/","page":"MoYeArray","title":"MoYeArray","text":"Pages = [\"array.md\"]","category":"page"},{"location":"api/array/","page":"MoYeArray","title":"MoYeArray","text":"ViewEngine\nArrayEngine\nMoYeArray\nrecast\nzeros!","category":"page"},{"location":"api/array/#MoYe.ViewEngine","page":"MoYeArray","title":"MoYe.ViewEngine","text":"ViewEngine{T, P}\n\nA wrapper of a pointer. P is the type of the pointer.\n\n\n\n\n\n","category":"type"},{"location":"api/array/#MoYe.ArrayEngine","page":"MoYeArray","title":"MoYe.ArrayEngine","text":"ArrayEngine{T, L} <: DenseVector{T}\n\nA owning and mutable vector of type T with static length L.\n\nExamples\n\n```julia julia> x = ArrayEngine{Float32}(undef, static(3)) 3-element ArrayEngine{Float32, 3}:  -9.8271385f-36   7.57f-43  -9.8271385f-36\n\njulia> x[1] = 10f0 10.0f0\n\njulia> x 3-element ArrayEngine{Float32, 3}:  10.0   7.57f-43  -9.8271385f-36\n\n\n\n\n\n","category":"type"},{"location":"api/array/#MoYe.MoYeArray","page":"MoYeArray","title":"MoYe.MoYeArray","text":"MoYeArray(engine::Engine, layout::Layout)\nMoYeArray{T}(::UndefInitializer, layout::StaticLayout)\nMoYeArray(ptr, layout::Layout)\n\nCreate a MoYeArray from an engine and a layout. See also ArrayEngine and ViewEngine.\n\nExamples\n\njulia> slayout = @Layout (5, 2);\n\njulia> array_engine = ArrayEngine{Float32}(undef, cosize(slayout)); # owning array\n\njulia> MoYeArray(array_engine, slayout)\n5×2 MoYeArray{Float32, 2, ArrayEngine{Float32, 10}, Layout{2, Tuple{Static.StaticInt{5}, Static.StaticInt{2}}, Tuple{Static.StaticInt{1}, Static.StaticInt{5}}}}:\n -3.24118f12   0.0\n  7.57f-43     0.0\n  0.0          0.0\n  0.0          0.0\n  7.89217f-40  0.0\n\njulia>  MoYeArray{Float32}(undef, slayout)\n5×2 MoYeArray{Float32, 2, ArrayEngine{Float32, 10}, Layout{2, Tuple{Static.StaticInt{5}, Static.StaticInt{2}}, Tuple{Static.StaticInt{1}, Static.StaticInt{5}}}}:\n  4.0f-45    7.57f-43\n  0.0        0.0\n -1.81623f7  0.0\n  7.57f-43   0.0\n -1.81623f7  0.0\n\njulia> A = ones(10);\n\njulia> MoYeArray(pointer(A), slayout) # non-owning array\n5×2 MoYeArray{Float64, 2, ViewEngine{Float64, Ptr{Float64}}, Layout{2, Tuple{Static.StaticInt{5}, Static.StaticInt{2}}, Tuple{Static.StaticInt{1}, Static.StaticInt{5}}}}:\n 1.0  1.0\n 1.0  1.0\n 1.0  1.0\n 1.0  1.0\n 1.0  1.0\n\njulia> function test_alloc()          # when powered by a ArrayEngine, MoYeArray is stack-allocated\n    slayout = @Layout (2, 3)          # and mutable\n    x = MoYeArray{Float32}(undef, slayout)\n    fill!(x, 1.0f0)\n    return sum(x)\nend\ntest_alloc (generic function with 2 methods)\n\njulia> @allocated(test_alloc())\n0\n\n\n\n\n\n\n","category":"type"},{"location":"api/array/#MoYe.recast","page":"MoYeArray","title":"MoYe.recast","text":"recast(::Type{NewType}, x::MoYeArray{OldType}) -> MoYeArray{NewType}\n\nRecast the element type of a MoYeArray. This is similar to Base.reinterpret, but dose all the computation at compile time, if possible.\n\nExamples\n\njulia> x = MoYeArray{Int32}(undef, @Layout((2,3)))\n2×3 MoYeArray{Int32, 2, ArrayEngine{Int32, 6}, Layout{2, Tuple{Static.StaticInt{2}, Static.StaticInt{3}}, Tuple{Static.StaticInt{1}, Static.StaticInt{2}}}}:\n -1948408944           0  2\n         514  -268435456  0\n\njulia> x2 = recast(Int16, x)\n4×3 MoYeArray{Int16, 2, ViewEngine{Int16, Ptr{Int16}}, Layout{2, Tuple{Static.StaticInt{4}, Static.StaticInt{3}}, Tuple{Static.StaticInt{1}, Static.StaticInt{4}}}}:\n -23664      0  2\n -29731      0  0\n    514      0  0\n      0  -4096  0\n\njulia> x3 = recast(Int64, x)\n1×3 MoYeArray{Int64, 2, ViewEngine{Int64, Ptr{Int64}}, Layout{2, Tuple{Static.StaticInt{1}, Static.StaticInt{3}}, Tuple{Static.StaticInt{1}, Static.StaticInt{1}}}}:\n 2209959748496  -1152921504606846976  2\n\n\n\n\n\n","category":"function"},{"location":"api/array/#MoYe.zeros!","page":"MoYeArray","title":"MoYe.zeros!","text":"zeros!(x::MoYeArray)\n\nFill x with zeros.\n\n\n\n\n\n","category":"function"},{"location":"api/tiling/","page":"Tiling","title":"Tiling","text":"CurrentModule = MoYe","category":"page"},{"location":"api/tiling/#Index","page":"Tiling","title":"Index","text":"","category":"section"},{"location":"api/tiling/","page":"Tiling","title":"Tiling","text":"Pages = [\"tiling.md\"]","category":"page"},{"location":"api/tiling/","page":"Tiling","title":"Tiling","text":"Tile\n@tile\n@parallelize","category":"page"},{"location":"api/tiling/#MoYe.Tile","page":"Tiling","title":"MoYe.Tile","text":"A tuple of Layouts, Colons or integers.\n\n\n\n\n\n","category":"type"},{"location":"api/tiling/#MoYe.@tile","page":"Tiling","title":"MoYe.@tile","text":"@tile x::MoYeArray tile::Tile, coord::Tuple\n\nTile x with tile and return the view of the tile itself at coord.\n\njulia> a = MoYeArray(pointer([i for i in 1:48]), @Layout((6,8)))\n\njulia> @tile a (static(2), static(2)) (1, 1)\n2×2 MoYeArray{Int64, 2, ViewEngine{Int64, Ptr{Int64}}, Layout{2, Tuple{StaticInt{2}, StaticInt{2}}, Tuple{StaticInt{1}, StaticInt{6}}}}:\n 1  7\n 2  8\n\n\n\n\n\n","category":"macro"},{"location":"api/tiling/#MoYe.@parallelize","page":"Tiling","title":"MoYe.@parallelize","text":"@parallelize x::MoYeArray tile::Tile coord::Tuple\n@parallelize x::MoYeArray thread_layout::Layout thread_id::Int\n\nTile x with tile and return the view of the entries that the thread with coord or thread_id will work on.\n\nExamples\n\nSay we have a MoYeArray x of shape (6, 8) and 4 threads of shape (2, 2). We would like to  partition x with the 4 threads and get a view of the entries that the first thread will work on. We can do this by calling @parallelize(x, (2, 2), 1).\n\njulia> a = MoYeArray(pointer([i for i in 1:48]), @Layout((6,8)))\n6×8 MoYeArray{Int64, 2, ViewEngine{Int64, Ptr{Int64}}, Layout{2, Tuple{Static.StaticInt{6}, Static.StaticInt{8}}, Tuple{Static.StaticInt{1}, Static.StaticInt{6}}}}:\n 1   7  13  19  25  31  37  43\n 2   8  14  20  26  32  38  44\n 3   9  15  21  27  33  39  45\n 4  10  16  22  28  34  40  46\n 5  11  17  23  29  35  41  47\n 6  12  18  24  30  36  42  48\n\njulia> @parallelize a (static(2), static(2)) (1, 1)\n3×4 MoYeArray{Int64, 2, ViewEngine{Int64, Ptr{Int64}}, Layout{2, Tuple{Static.StaticInt{3}, Static.StaticInt{4}}, Tuple{Static.StaticInt{2}, Static.StaticInt{12}}}}:\n 1  13  25  37\n 3  15  27  39\n 5  17  29  41\n\nYou can also pass in a thread layout and a thread id to get the tile:\n\njulia> @parallelize a @Layout((2,2), (1, 2)) 2\n3×4 MoYeArray{Int64, 2, ViewEngine{Int64, Ptr{Int64}}, Layout{2, Tuple{StaticInt{3}, StaticInt{4}}, Tuple{StaticInt{2}, StaticInt{12}}}}:\n 2  14  26  38\n 4  16  28  40\n 6  18  30  42\n\njulia> @parallelize a @Layout((2,2), (2, 1)) 2\n3×4 MoYeArray{Int64, 2, ViewEngine{Int64, Ptr{Int64}}, Layout{2, Tuple{StaticInt{3}, StaticInt{4}}, Tuple{StaticInt{2}, StaticInt{12}}}}:\n  7  19  31  43\n  9  21  33  45\n 11  23  35  47\n\n\n\n\n\n","category":"macro"},{"location":"api/copy/#Data-Movement","page":"-","title":"Data Movement","text":"","category":"section"},{"location":"api/copy/","page":"-","title":"-","text":"CurrentModule = MoYe","category":"page"},{"location":"api/copy/#Index","page":"-","title":"Index","text":"","category":"section"},{"location":"api/copy/","page":"-","title":"-","text":"Pages = [\"copy.md\"]","category":"page"},{"location":"api/copy/","page":"-","title":"-","text":"cucopyto!\ncp_async_wait\ncp_async_commit","category":"page"},{"location":"api/copy/#MoYe.cucopyto!","page":"-","title":"MoYe.cucopyto!","text":"cucopyto!(dest::MoYeArray, src::MoYeArray)\n\nCopy the contents of src to dest. The function automatically carries out potential vectorization. In particular, while transferring data from global memory to shared memory, it automatically initiates asynchronous copying, if your device supports so.\n\nnote: Note\nIt should be used with @gc_preserve if dest or src is powered by an ArrayEngine.\n\n\n\n\n\n","category":"function"},{"location":"api/copy/#MoYe.cp_async_wait","page":"-","title":"MoYe.cp_async_wait","text":"cp_async_wait(i::Int32)\ncp_async_wait()\n\ncp.async.wait.group and cp.async.wait.all.\n\n\n\n\n\n","category":"function"},{"location":"api/copy/#MoYe.cp_async_commit","page":"-","title":"MoYe.cp_async_commit","text":"cp_async_commit()\n\ncp.async.commit.group.\n\n\n\n\n\n","category":"function"},{"location":"api/layout/#Layout","page":"Layout","title":"Layout","text":"","category":"section"},{"location":"api/layout/","page":"Layout","title":"Layout","text":"CurrentModule = MoYe","category":"page"},{"location":"api/layout/#Index","page":"Layout","title":"Index","text":"","category":"section"},{"location":"api/layout/","page":"Layout","title":"Layout","text":"Pages = [\"layout.md\"]","category":"page"},{"location":"api/layout/#Constructors","page":"Layout","title":"Constructors","text":"","category":"section"},{"location":"api/layout/","page":"Layout","title":"Layout","text":"@Layout\nmake_layout\nmake_ordered_layout\nmake_fragment_like","category":"page"},{"location":"api/layout/#MoYe.@Layout","page":"Layout","title":"MoYe.@Layout","text":"Layout(shape, stride=nothing)\n\nConstruct a static layout with the given shape and stride.\n\nArguments\n\nshape: a tuple of integers or a single integer\nstride: a tuple of integers, a single integer, GenColMajor or GenRowMajor\n\n\n\n\n\n","category":"macro"},{"location":"api/layout/#MoYe.make_layout","page":"Layout","title":"MoYe.make_layout","text":"make_layout(shape, stride)\n\nConstruct a layout with the given shape and stride. If the stride is not given, it is set to col-major compact stride.\n\n\n\n\n\n","category":"function"},{"location":"api/layout/#MoYe.make_ordered_layout","page":"Layout","title":"MoYe.make_ordered_layout","text":"make_ordered_layout(shape, order)\nmake_ordered_layout(layout)\n\nConstruct a compact layout with the given shape and the stride is following the given order.\n\nExamples\n\njulia> MoYe.make_ordered_layout((3, 5), (2, 6))\n(3, 5):(static(1), 3)\n\njulia> MoYe.make_ordered_layout((3, 5), (10, 2))\n(3, 5):(5, static(1))\n\n\n\n\n\n","category":"function"},{"location":"api/layout/#MoYe.make_fragment_like","page":"Layout","title":"MoYe.make_fragment_like","text":"make_fragment_like(::Layout) -> Layout\nmake_fragment_like(T, ::MoYeArray) -> MoYeArray\n\nMake a compact layout of the same shape with the first mode being col-major, and with the rest following the given order.\n\n\n\n\n\n","category":"function"},{"location":"api/layout/#Product","page":"Layout","title":"Product","text":"","category":"section"},{"location":"api/layout/","page":"Layout","title":"Layout","text":"logical_product\nblocked_product\nraked_product","category":"page"},{"location":"api/layout/#MoYe.logical_product","page":"Layout","title":"MoYe.logical_product","text":"logical_product(A::Layout, B::Layout)\n\nCompute the logical product of two layouts. Indexing through the first mode of the new layout corresponds to indexing through A and indexing through the second mode corresponds to indexing through B.\n\njulia> tile = @Layout((2,2), (1,2));\n\njulia> print_layout(tile)\n(static(2), static(2)):(static(1), static(2))\n      1   2\n    +---+---+\n 1  | 1 | 3 |\n    +---+---+\n 2  | 2 | 4 |\n    +---+---+\n\njulia> matrix_of_tiles = @Layout((3,4), (4,1));\n\njulia> print_layout(matrix_of_tiles)\n(static(3), static(4)):(static(4), static(1))\n       1    2    3    4\n    +----+----+----+----+\n 1  |  1 |  2 |  3 |  4 |\n    +----+----+----+----+\n 2  |  5 |  6 |  7 |  8 |\n    +----+----+----+----+\n 3  |  9 | 10 | 11 | 12 |\n    +----+----+----+----+\n\njulia> print_layout(logical_product(tile, matrix_of_tiles))\n((static(2), static(2)), (static(3), static(4))):((static(1), static(2)), (static(16), static(4)))\n       1    2    3    4    5    6    7    8    9   10   11   12\n    +----+----+----+----+----+----+----+----+----+----+----+----+\n 1  |  1 | 17 | 33 |  5 | 21 | 37 |  9 | 25 | 41 | 13 | 29 | 45 |\n    +----+----+----+----+----+----+----+----+----+----+----+----+\n 2  |  2 | 18 | 34 |  6 | 22 | 38 | 10 | 26 | 42 | 14 | 30 | 46 |\n    +----+----+----+----+----+----+----+----+----+----+----+----+\n 3  |  3 | 19 | 35 |  7 | 23 | 39 | 11 | 27 | 43 | 15 | 31 | 47 |\n    +----+----+----+----+----+----+----+----+----+----+----+----+\n 4  |  4 | 20 | 36 |  8 | 24 | 40 | 12 | 28 | 44 | 16 | 32 | 48 |\n    +----+----+----+----+----+----+----+----+----+----+----+----+\n\n\n\n\n\n","category":"function"},{"location":"api/layout/#MoYe.blocked_product","page":"Layout","title":"MoYe.blocked_product","text":"blocked_product(tile::Layout, matrix_of_tiles::Layout, coalesce_result::Bool=false)\n\nCompute the blocked product of two layouts. Indexing through the first mode of the new layout corresponds to indexing through the cartesian product of the first mode of tile and the first mode of matrix_of_tiles. Indexing through the second mode is similar. If coalesce_result is true, then the result is coalesced.\n\njulia> tile = @Layout (2, 2);\n\njulia> matrix_of_tiles = @Layout (3, 4) (4, 1);\n\njulia> print_layout(blocked_product(tile, matrix_of_tiles))\n((static(2), static(3)), (static(2), static(4))):((static(1), static(16)), (static(2), static(4)))\n       1    2    3    4    5    6    7    8\n    +----+----+----+----+----+----+----+----+\n 1  |  1 |  3 |  5 |  7 |  9 | 11 | 13 | 15 |\n    +----+----+----+----+----+----+----+----+\n 2  |  2 |  4 |  6 |  8 | 10 | 12 | 14 | 16 |\n    +----+----+----+----+----+----+----+----+\n 3  | 17 | 19 | 21 | 23 | 25 | 27 | 29 | 31 |\n    +----+----+----+----+----+----+----+----+\n 4  | 18 | 20 | 22 | 24 | 26 | 28 | 30 | 32 |\n    +----+----+----+----+----+----+----+----+\n 5  | 33 | 35 | 37 | 39 | 41 | 43 | 45 | 47 |\n    +----+----+----+----+----+----+----+----+\n 6  | 34 | 36 | 38 | 40 | 42 | 44 | 46 | 48 |\n    +----+----+----+----+----+----+----+----+\n\n\n\n\n\n","category":"function"},{"location":"api/layout/#MoYe.raked_product","page":"Layout","title":"MoYe.raked_product","text":"raked_product(tile::Layout, matrix_of_tiles::Layout, coalesce_result::Bool=false)\n\nThe tile is shattered or interleaved with the matrix of tiles.\n\njulia> tile = @Layout (2, 2) (1, 2);\n\njulia> matrix_of_tiles = @Layout (3, 4) (4, 1);\n\njulia> print_layout(raked_product(tile, matrix_of_tiles))\n((static(3), static(2)), (static(4), static(2))):((static(16), static(1)), (static(4), static(2)))\n       1    2    3    4    5    6    7    8\n    +----+----+----+----+----+----+----+----+\n 1  |  1 |  5 |  9 | 13 |  3 |  7 | 11 | 15 |\n    +----+----+----+----+----+----+----+----+\n 2  | 17 | 21 | 25 | 29 | 19 | 23 | 27 | 31 |\n    +----+----+----+----+----+----+----+----+\n 3  | 33 | 37 | 41 | 45 | 35 | 39 | 43 | 47 |\n    +----+----+----+----+----+----+----+----+\n 4  |  2 |  6 | 10 | 14 |  4 |  8 | 12 | 16 |\n    +----+----+----+----+----+----+----+----+\n 5  | 18 | 22 | 26 | 30 | 20 | 24 | 28 | 32 |\n    +----+----+----+----+----+----+----+----+\n 6  | 34 | 38 | 42 | 46 | 36 | 40 | 44 | 48 |\n    +----+----+----+----+----+----+----+----+\n\n\n\n\n\n","category":"function"},{"location":"api/layout/#Division","page":"Layout","title":"Division","text":"","category":"section"},{"location":"api/layout/","page":"Layout","title":"Layout","text":"logical_divide\nzipped_divide\ntiled_divide","category":"page"},{"location":"api/layout/#MoYe.logical_divide","page":"Layout","title":"MoYe.logical_divide","text":"logical_divide(layout::Layout, tile::Tile)\n\nGather the elements of layout along all modes into blocks according to tile.\n\njulia> raked_prod = @Layout ((3, 2), (4, 2)) ((16, 1), (4, 2));\n\njulia> print_layout(raked_prod)\n((static(3), static(2)), (static(4), static(2))):((static(16), static(1)), (static(4), static(2)))\n       1    2    3    4    5    6    7    8\n    +----+----+----+----+----+----+----+----+\n 1  |  1 |  5 |  9 | 13 |  3 |  7 | 11 | 15 |\n    +----+----+----+----+----+----+----+----+\n 2  | 17 | 21 | 25 | 29 | 19 | 23 | 27 | 31 |\n    +----+----+----+----+----+----+----+----+\n 3  | 33 | 37 | 41 | 45 | 35 | 39 | 43 | 47 |\n    +----+----+----+----+----+----+----+----+\n 4  |  2 |  6 | 10 | 14 |  4 |  8 | 12 | 16 |\n    +----+----+----+----+----+----+----+----+\n 5  | 18 | 22 | 26 | 30 | 20 | 24 | 28 | 32 |\n    +----+----+----+----+----+----+----+----+\n 6  | 34 | 38 | 42 | 46 | 36 | 40 | 44 | 48 |\n    +----+----+----+----+----+----+----+----+\n\njulia> subtile = (Layout(2, 3), Layout(2, 4)); # gather 2 elements with stride 3 along the first mode\n       # and 2 elements with stride 4 along the second mode\n\n\njulia> print_layout(logical_divide(raked_prod, subtile))\n(((1, 2), ((3, 1), (1, 1))), ((1, 2), ((4, 1), (1, 1)))):(((48, 1), ((static(16), static(1)), (48, 2))), ((16, 2), ((static(4), static(2)), (16, 4))))\n       1    2    3    4    5    6    7    8\n    +----+----+----+----+----+----+----+----+\n 1  |  1 |  3 |  5 |  7 |  9 | 11 | 13 | 15 |\n    +----+----+----+----+----+----+----+----+\n 2  |  2 |  4 |  6 |  8 | 10 | 12 | 14 | 16 |\n    +----+----+----+----+----+----+----+----+\n 3  | 17 | 19 | 21 | 23 | 25 | 27 | 29 | 31 |\n    +----+----+----+----+----+----+----+----+\n 4  | 18 | 20 | 22 | 24 | 26 | 28 | 30 | 32 |\n    +----+----+----+----+----+----+----+----+\n 5  | 33 | 35 | 37 | 39 | 41 | 43 | 45 | 47 |\n    +----+----+----+----+----+----+----+----+\n 6  | 34 | 36 | 38 | 40 | 42 | 44 | 46 | 48 |\n    +----+----+----+----+----+----+----+----+\n\n\n\n\n\n","category":"function"},{"location":"api/layout/#MoYe.zipped_divide","page":"Layout","title":"MoYe.zipped_divide","text":"zipped_divide(layout::Layout, tile::Tile)\n\nCompute the logical division of layout by tile, then zip the blocks into the first mode and the rest into the second mode.\n\njulia> raked_prod = @Layout ((3, 2), (4, 2)) ((16, 1), (4, 2));\n\njulia> print_layout(raked_prod)\n((static(3), static(2)), (static(4), static(2))):((static(16), static(1)), (static(4), static(2)))\n       1    2    3    4    5    6    7    8\n    +----+----+----+----+----+----+----+----+\n 1  |  1 |  5 |  9 | 13 |  3 |  7 | 11 | 15 |\n    +----+----+----+----+----+----+----+----+\n 2  | 17 | 21 | 25 | 29 | 19 | 23 | 27 | 31 |\n    +----+----+----+----+----+----+----+----+\n 3  | 33 | 37 | 41 | 45 | 35 | 39 | 43 | 47 |\n    +----+----+----+----+----+----+----+----+\n 4  |  2 |  6 | 10 | 14 |  4 |  8 | 12 | 16 |\n    +----+----+----+----+----+----+----+----+\n 5  | 18 | 22 | 26 | 30 | 20 | 24 | 28 | 32 |\n    +----+----+----+----+----+----+----+----+\n 6  | 34 | 38 | 42 | 46 | 36 | 40 | 44 | 48 |\n    +----+----+----+----+----+----+----+----+\n\njulia> subtile = (@Layout(2, 3), @Layout(2, 4)); # gather 2 elements with stride 3 along the first mode and 2 elements with stride 4 along the second mode\n\njulia> print_layout(zipped_divide(raked_prod, subtile))\n((static(2), static(2)), (static(3), static(4))):((static(1), static(2)), (static(16), static(4)))\n       1    2    3    4    5    6    7    8    9   10   11   12\n    +----+----+----+----+----+----+----+----+----+----+----+----+\n 1  |  1 | 17 | 33 |  5 | 21 | 37 |  9 | 25 | 41 | 13 | 29 | 45 |\n    +----+----+----+----+----+----+----+----+----+----+----+----+\n 2  |  2 | 18 | 34 |  6 | 22 | 38 | 10 | 26 | 42 | 14 | 30 | 46 |\n    +----+----+----+----+----+----+----+----+----+----+----+----+\n 3  |  3 | 19 | 35 |  7 | 23 | 39 | 11 | 27 | 43 | 15 | 31 | 47 |\n    +----+----+----+----+----+----+----+----+----+----+----+----+\n 4  |  4 | 20 | 36 |  8 | 24 | 40 | 12 | 28 | 44 | 16 | 32 | 48 |\n    +----+----+----+----+----+----+----+----+----+----+----+----+\n\n\n\n\n\n","category":"function"},{"location":"api/layout/#MoYe.tiled_divide","page":"Layout","title":"MoYe.tiled_divide","text":"tiled_divide(layout::Layout, tile::Tile)\n\nSimilar to zipped_divide, but upack the second mode into multiple modes.\n\n\n\n\n\n","category":"function"},{"location":"","page":"Home","title":"Home","text":"CurrentModule = MoYe","category":"page"},{"location":"#MoYe","page":"Home","title":"MoYe","text":"","category":"section"},{"location":"","page":"Home","title":"Home","text":"Documentation for MoYe.","category":"page"},{"location":"manual/layout/#Layout","page":"Layout","title":"Layout","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"Mathematically, a Layout represents a function that maps logical coordinates to physical 1-D index spaces. It consists of a Shape and a Stride, wherein the Shape determines the domain, and the Stride establishes the mapping through an inner product.","category":"page"},{"location":"manual/layout/#Constructing-a-Layout","page":"Layout","title":"Constructing a Layout","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"using MoYe\nlayout_2x4 = make_layout((2, (2, 2)), (4, (1, 2)))\nprint(\"Shape: \", shape(layout_2x4))\nprint(\"Stride: \", stride(layout_2x4))\nprint(\"Size: \", size(layout_2x4)) # the domain is (1,2,...,8)\nprint(\"Rank: \", rank(layout_2x4))\nprint(\"Depth: \", depth(layout_2x4))\nprint(\"Cosize: \", cosize(layout_2x4)) \n(layout_2x4) # this can be viewed as a row-major matrix","category":"page"},{"location":"manual/layout/#Compile-time-ness-of-values","page":"Layout","title":"Compile-time-ness of values","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"You can also use static integers:","category":"page"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"static_layout = @Layout (2, (2, 2)) (4, (1, 2))\ntypeof(static_layout)\nsizeof(static_layout)\n","category":"page"},{"location":"manual/layout/#Coordinate-space","page":"Layout","title":"Coordinate space","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"The coordinate space of a Layout is determined by its Shape. This coordinate space can be viewed in three different ways:","category":"page"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"h-D coordinate space: Each element in this space possesses the exact hierarchical structure as defined by the Shape. Here h stands for \"hierarchical\".\n1-D coordinate space: This can be visualized as the colexicographically flattening of the coordinate space into a one-dimensional space.\nR-D coordinate space: In this space, each element has the same rank as the Shape, but each mode (top-level axis) of the Shape is colexicographically flattened into a one-dimensional space. Here R stands for the rank of the layout.","category":"page"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"layout_2x4(2, (1, 2)) # h-D coordinate\nlayout_2x4(2, 3) # R-D coordinate\nlayout_2x4(6) # 1-D coordinate","category":"page"},{"location":"manual/layout/#Concatenation","page":"Layout","title":"Concatenation","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"A layout can be expressed as the concatenation of its sublayouts.","category":"page"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"layout_2x4[2] # get the second sublayout\ntuple(layout_2x4...) # splatting a layout into sublayouts\nmake_layout(layout_2x4...) # concatenating sublayouts\nfor sublayout in layout_2x4 # iterating a layout\n   @show sublayout\nend","category":"page"},{"location":"manual/layout/#Flatten","page":"Layout","title":"Flatten","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"layout = make_layout(((4, 3), 1), ((3, 1), 0))\nprint(flatten(layout))","category":"page"},{"location":"manual/layout/#Coalesce","page":"Layout","title":"Coalesce","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"layout = @Layout (2, (1, 6)) (1, (6, 2)) # layout has to be static\nprint(coalesce(layout))","category":"page"},{"location":"manual/layout/#Composition","page":"Layout","title":"Composition","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"Layouts are functions and thus can possibly be composed.","category":"page"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"make_layout(20, 2) ∘ make_layout((4, 5), (1, 4)) \nmake_layout(20, 2) ∘ make_layout((4, 5), (5, 1))","category":"page"},{"location":"manual/layout/#Complement","page":"Layout","title":"Complement","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"complement(@Layout(4, 1), static(24))\ncomplement(@Layout(6, 4), static(24))","category":"page"},{"location":"manual/layout/#Product","page":"Layout","title":"Product","text":"","category":"section"},{"location":"manual/layout/#Logical-product","page":"Layout","title":"Logical product","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"tile = @Layout((2,2), (1,2));\nprint_layout(tile)\nmatrix_of_tiles = @Layout((3,4), (4,1));\nprint_layout(matrix_of_tiles)\nprint_layout(logical_product(tile, matrix_of_tiles))","category":"page"},{"location":"manual/layout/#Blocked-product","page":"Layout","title":"Blocked product","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"print_layout(blocked_product(tile, matrix_of_tiles))","category":"page"},{"location":"manual/layout/#Raked-product","page":"Layout","title":"Raked product","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"print_layout(raked_product(tile, matrix_of_tiles))","category":"page"},{"location":"manual/layout/#Division","page":"Layout","title":"Division","text":"","category":"section"},{"location":"manual/layout/#Logical-division","page":"Layout","title":"Logical division","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"raked_prod = raked_product(tile, matrix_of_tiles);\nsubtile = (Layout(2,3), Layout(2,4));\nprint_layout(logical_divide(raked_prod, subtile))","category":"page"},{"location":"manual/layout/#Zipped-division","page":"Layout","title":"Zipped division","text":"","category":"section"},{"location":"manual/layout/","page":"Layout","title":"Layout","text":"print_layout(zipped_divide(raked_prod, subtile))","category":"page"}]
}
